import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import Category from "@/models/category.model";
import Product from "@/models/product.model";

// ─── GET /api/categories — Public category listing ──────────────────────────
// Only returns active categories, each with a count of its active products.
// Supports parent filter.

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const parentParam = searchParams.get("parent");

    const filter: Record<string, unknown> = { isActive: true };
    if (parentParam === "null") {
      filter.parent = null;
    } else if (parentParam) {
      filter.parent = parentParam;
    }

    const categories = await Category.find(filter)
      .populate("parent", "name slug")
      .sort({ name: 1 })
      .select("-__v")
      .lean();

    const counts = await Product.aggregate<{ _id: unknown; count: number }>([
      {
        $match: {
          isActive: true,
          category: { $in: categories.map((cat) => cat._id) },
        },
      },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(counts.map((row) => [String(row._id), row.count]));

    return successResponse(
      categories.map((cat) => ({
        ...cat,
        productCount: countByCategory.get(String(cat._id)) ?? 0,
      }))
    );
  } catch (err) {
    console.error("[Categories] Public list error:", err);
    return errorResponse("Failed to fetch categories", 500);
  }
}
