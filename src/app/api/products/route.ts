import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import Product from "@/models/product.model";

// ─── GET /api/products — Public product listing ─────────────────────────────
// Only returns active products. Supports pagination, filtering, and search.

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const sort = searchParams.get("sort") ?? "createdAt";
    const order = searchParams.get("order") === "asc" ? 1 : -1;

    // Base filter: only active products
    const filter: Record<string, unknown> = { isActive: true };

    // Optional filters
    const categoryParam = searchParams.get("category");
    if (categoryParam) filter.category = categoryParam;

    const featuredParam = searchParams.get("featured");
    if (featuredParam === "true") filter.isFeatured = true;

    const tagParam = searchParams.get("tag");
    if (tagParam) filter.tags = tagParam;

    const search = searchParams.get("search");
    if (search) {
      filter.$text = { $search: search };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .select("-__v")
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
    console.error("[Products] Public list error:", err);
    return errorResponse("Failed to fetch products", 500);
  }
}
