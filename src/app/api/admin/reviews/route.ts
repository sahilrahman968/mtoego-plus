import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Review from "@/models/review.model";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status") || "";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(
      30,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 15))
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (status === "visible") filter.isHidden = false;
    if (status === "hidden") filter.isHidden = true;
    if (search) {
      filter.$or = [
        { comment: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Review.find(filter)
        .populate("user", "name email")
        .populate("product", "title slug")
        .populate("hiddenBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    return successResponse({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("GET /api/admin/reviews error:", err);
    return errorResponse("Failed to fetch reviews", 500);
  }
}
