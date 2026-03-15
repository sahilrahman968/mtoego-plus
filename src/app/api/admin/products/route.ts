import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { validateCreateProduct } from "@/lib/validators";
import Product from "@/models/product.model";
import Category from "@/models/category.model";

// ─── GET /api/admin/products — List all products (including inactive) ───────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const sort = searchParams.get("sort") ?? "createdAt";
    const order = searchParams.get("order") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};

    // Optional filters
    const categoryParam = searchParams.get("category");
    if (categoryParam) filter.category = categoryParam;

    const activeParam = searchParams.get("isActive");
    if (activeParam === "true") filter.isActive = true;
    if (activeParam === "false") filter.isActive = false;

    const featuredParam = searchParams.get("isFeatured");
    if (featuredParam === "true") filter.isFeatured = true;
    if (featuredParam === "false") filter.isFeatured = false;

    const search = searchParams.get("search");
    if (search) {
      filter.$text = { $search: search };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .sort({ [sort]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return successResponse({
      items: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("[Products] List error:", err);
    return errorResponse("Failed to fetch products", 500);
  }
}

// ─── POST /api/admin/products — Create a product ────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const body = await request.json();
    const validation = validateCreateProduct(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    // Verify category exists
    const category = await Category.findById(body.category).lean();
    if (!category) {
      return errorResponse("Category not found", 404);
    }

    // Check for duplicate slug
    const existingSlug = await Product.findOne({ slug: body.slug }).lean();
    if (existingSlug) {
      return errorResponse("A product with this slug already exists", 409);
    }

    // Check for duplicate SKUs across all products
    const newSkus = body.variants.map((v: { sku: string }) => v.sku.toUpperCase());
    const existingSku = await Product.findOne({
      "variants.sku": { $in: newSkus },
    }).lean();
    if (existingSku) {
      return errorResponse("One or more SKUs already exist in another product", 409);
    }

    const product = await Product.create({
      title: body.title.trim(),
      slug: body.slug.toLowerCase().trim(),
      description: body.description.trim(),
      category: body.category,
      images: body.images ?? [],
      variants: body.variants.map((v: Record<string, unknown>) => ({
        size: typeof v.size === "string" ? v.size.trim() : undefined,
        color: typeof v.color === "string" ? v.color.trim() : undefined,
        sku: (v.sku as string).toUpperCase().trim(),
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock ?? 0,
        isActive: v.isActive ?? true,
      })),
      isActive: body.isActive ?? true,
      isFeatured: body.isFeatured ?? false,
      tags: body.tags ?? [],
    });

    const populated = await Product.findById(product._id)
      .populate("category", "name slug")
      .lean();

    return successResponse(populated, "Product created successfully", 201);
  } catch (err) {
    console.error("[Products] Create error:", err);
    if ((err as { code?: number }).code === 11000) {
      const msg = String(err);
      if (msg.includes("slug")) {
        return errorResponse("A product with this slug already exists", 409);
      }
      if (msg.includes("sku")) {
        return errorResponse("One or more SKUs already exist", 409);
      }
      return errorResponse("Duplicate key error", 409);
    }
    return errorResponse("Failed to create product", 500);
  }
}
