import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { isValidObjectId, validateUpdateProduct } from "@/lib/validators";
import { deleteImages } from "@/lib/cloudinary";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import { IProductImage } from "@/models/product.model";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/admin/products/:id — Get single product (admin view) ──────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const product = await Product.findById(id)
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    return successResponse(product);
  } catch (err) {
    console.error("[Products] Get error:", err);
    return errorResponse("Failed to fetch product", 500);
  }
}

// ─── PUT /api/admin/products/:id — Update a product ─────────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const body = await request.json();
    const validation = validateUpdateProduct(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return errorResponse("Product not found", 404);
    }

    // If slug is being changed, check for duplicates
    if (body.slug && body.slug !== existingProduct.slug) {
      const slugExists = await Product.findOne({
        slug: body.slug,
        _id: { $ne: id },
      }).lean();
      if (slugExists) {
        return errorResponse("A product with this slug already exists", 409);
      }
    }

    // If category is being changed, verify it exists
    if (body.category) {
      const category = await Category.findById(body.category).lean();
      if (!category) {
        return errorResponse("Category not found", 404);
      }
    }

    // If variants are being updated, check for SKU conflicts
    if (body.variants) {
      const newSkus = body.variants.map((v: { sku: string }) => v.sku.toUpperCase());
      const skuConflict = await Product.findOne({
        _id: { $ne: id },
        "variants.sku": { $in: newSkus },
      }).lean();
      if (skuConflict) {
        return errorResponse("One or more SKUs already exist in another product", 409);
      }
    }

    // ── Handle image deletions ──────────────────────────────────────────
    // If images array is provided, identify removed images and delete from Cloudinary
    if (body.images !== undefined) {
      const existingPublicIds = new Set(
        existingProduct.images.map((img: IProductImage) => img.publicId)
      );
      const newPublicIds = new Set(
        (body.images as { publicId: string }[]).map((img) => img.publicId)
      );

      const removedPublicIds = [...existingPublicIds].filter(
        (pid) => !newPublicIds.has(pid)
      );

      if (removedPublicIds.length > 0) {
        try {
          await deleteImages(removedPublicIds);
        } catch (delErr) {
          console.error("[Products] Failed to delete images from Cloudinary:", delErr);
          // Non-blocking — the product update should still proceed
        }
      }
    }

    // ── Build update object ─────────────────────────────────────────────
    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.slug !== undefined) updateData.slug = body.slug.toLowerCase().trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.category !== undefined) updateData.category = body.category;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.variants !== undefined) {
      updateData.variants = body.variants.map((v: Record<string, unknown>) => ({
        ...(v._id ? { _id: v._id } : {}),
        size: typeof v.size === "string" ? v.size.trim() : undefined,
        color: typeof v.color === "string" ? v.color.trim() : undefined,
        sku: (v.sku as string).toUpperCase().trim(),
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock ?? 0,
        isActive: v.isActive ?? true,
      }));
    }
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("category", "name slug")
      .lean();

    return successResponse(product, "Product updated successfully");
  } catch (err) {
    console.error("[Products] Update error:", err);
    if ((err as { code?: number }).code === 11000) {
      return errorResponse("Duplicate slug or SKU conflict", 409);
    }
    return errorResponse("Failed to update product", 500);
  }
}

// ─── DELETE /api/admin/products/:id — Delete a product ──────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const product = await Product.findById(id);
    if (!product) {
      return errorResponse("Product not found", 404);
    }

    // Delete all product images from Cloudinary
    const publicIds = product.images.map((img: IProductImage) => img.publicId);
    if (publicIds.length > 0) {
      try {
        await deleteImages(publicIds);
      } catch (delErr) {
        console.error("[Products] Failed to delete images from Cloudinary:", delErr);
        // Non-blocking — still delete the product from DB
      }
    }

    await Product.findByIdAndDelete(id);

    return successResponse(null, "Product deleted successfully");
  } catch (err) {
    console.error("[Products] Delete error:", err);
    return errorResponse("Failed to delete product", 500);
  }
}
