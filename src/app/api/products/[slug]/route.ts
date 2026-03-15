import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { isValidSlug } from "@/lib/validators";
import Product from "@/models/product.model";

type RouteParams = { params: Promise<{ slug: string }> };

// ─── GET /api/products/:slug — Public product detail by slug ────────────────
// Only returns active products.

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!isValidSlug(slug)) {
      return errorResponse("Invalid product slug", 400);
    }

    await connectDB();

    const product = await Product.findOne({ slug, isActive: true })
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    return successResponse(product);
  } catch (err) {
    console.error("[Products] Public get error:", err);
    return errorResponse("Failed to fetch product", 500);
  }
}
