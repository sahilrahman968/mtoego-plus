import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { isValidObjectId, validateUpdateCategory } from "@/lib/validators";
import Category from "@/models/category.model";
import Product from "@/models/product.model";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/admin/categories/:id — Get single category ────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    await connectDB();

    const category = await Category.findById(id)
      .populate("parent", "name slug")
      .lean();

    if (!category) {
      return errorResponse("Category not found", 404);
    }

    return successResponse(category);
  } catch (err) {
    console.error("[Categories] Get error:", err);
    return errorResponse("Failed to fetch category", 500);
  }
}

// ─── PUT /api/admin/categories/:id — Update a category ──────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    await connectDB();

    const body = await request.json();
    const validation = validateUpdateCategory(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    // Prevent self-referencing parent
    if (body.parent === id) {
      return errorResponse("A category cannot be its own parent", 400);
    }

    // If slug is being changed, check for duplicates
    if (body.slug) {
      const existing = await Category.findOne({
        slug: body.slug,
        _id: { $ne: id },
      }).lean();
      if (existing) {
        return errorResponse("A category with this slug already exists", 409);
      }
    }

    // If parent is specified, verify it exists
    if (body.parent) {
      const parentExists = await Category.findById(body.parent).lean();
      if (!parentExists) {
        return errorResponse("Parent category not found", 404);
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.slug !== undefined) updateData.slug = body.slug.toLowerCase().trim();
    if (body.description !== undefined) updateData.description = body.description?.trim();
    if (body.image !== undefined) updateData.image = body.image;
    if (body.parent !== undefined) updateData.parent = body.parent ?? null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const category = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("parent", "name slug")
      .lean();

    if (!category) {
      return errorResponse("Category not found", 404);
    }

    return successResponse(category, "Category updated successfully");
  } catch (err) {
    console.error("[Categories] Update error:", err);
    if ((err as { code?: number }).code === 11000) {
      return errorResponse("A category with this slug already exists", 409);
    }
    return errorResponse("Failed to update category", 500);
  }
}

// ─── DELETE /api/admin/categories/:id — Delete a category ───────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid category ID", 400);
    }

    await connectDB();

    // Check if any products reference this category
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return errorResponse(
        `Cannot delete: ${productCount} product(s) belong to this category. Reassign them first.`,
        409
      );
    }

    // Check if any child categories reference this category
    const childCount = await Category.countDocuments({ parent: id });
    if (childCount > 0) {
      return errorResponse(
        `Cannot delete: ${childCount} subcategory(ies) belong to this category. Reassign them first.`,
        409
      );
    }

    const category = await Category.findByIdAndDelete(id).lean();
    if (!category) {
      return errorResponse("Category not found", 404);
    }

    return successResponse(null, "Category deleted successfully");
  } catch (err) {
    console.error("[Categories] Delete error:", err);
    return errorResponse("Failed to delete category", 500);
  }
}
