import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Review from "@/models/review.model";
import { Types } from "mongoose";

type RouteParams = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { reviewId } = await params;
    if (!isValidObjectId(reviewId)) {
      return errorResponse("Invalid review ID", 400);
    }

    const body = (await request.json()) as {
      isHidden?: unknown;
      hiddenReason?: unknown;
    };
    if (typeof body.isHidden !== "boolean") {
      return errorResponse("isHidden must be boolean", 400);
    }

    const hiddenReason =
      typeof body.hiddenReason === "string" ? body.hiddenReason.trim() : "";
    if (body.isHidden && hiddenReason.length < 3) {
      return errorResponse("A moderation reason is required (min 3 chars)", 400);
    }
    if (hiddenReason.length > 300) {
      return errorResponse("Moderation reason must be at most 300 chars", 400);
    }

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) {
      return errorResponse("Review not found", 404);
    }

    review.isHidden = body.isHidden;
    review.hiddenReason = body.isHidden ? hiddenReason : undefined;
    review.hiddenBy = body.isHidden
      ? review.hiddenBy ?? new Types.ObjectId(auth.userId)
      : undefined;
    if (!body.isHidden) {
      review.hiddenBy = undefined;
    } else {
      review.hiddenBy = new Types.ObjectId(auth.userId);
    }

    await review.save();
    return successResponse(review, body.isHidden ? "Review hidden" : "Review unhidden");
  } catch (err) {
    console.error("PATCH /api/admin/reviews/[reviewId] error:", err);
    return errorResponse("Failed to moderate review", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { reviewId } = await params;
    if (!isValidObjectId(reviewId)) {
      return errorResponse("Invalid review ID", 400);
    }

    await connectDB();

    const deleted = await Review.findByIdAndDelete(reviewId);
    if (!deleted) {
      return errorResponse("Review not found", 404);
    }

    return successResponse(null, "Review deleted permanently");
  } catch (err) {
    console.error("DELETE /api/admin/reviews/[reviewId] error:", err);
    return errorResponse("Failed to delete review", 500);
  }
}
