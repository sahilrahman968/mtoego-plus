import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import Category from "@/models/category.model";

// ─── GET /api/categories — Public category listing ──────────────────────────
// Only returns active categories. Supports parent filter.

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

    return successResponse(categories);
  } catch (err) {
    console.error("[Categories] Public list error:", err);
    return errorResponse("Failed to fetch categories", 500);
  }
}
