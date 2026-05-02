import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Review from "@/models/review.model";

type RouteParams = { params: Promise<{ reviewId: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { reviewId } = await params;
    if (!isValidObjectId(reviewId)) {
      return errorResponse("Invalid review ID", 400);
    }

    const body = (await request.json()) as { rating?: unknown; comment?: unknown };
    const rating =
      typeof body.rating === "number" && Number.isInteger(body.rating) ? body.rating : null;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!rating || rating < 1 || rating > 5) {
      return errorResponse("Rating must be an integer between 1 and 5", 400);
    }
    if (comment.length < 3 || comment.length > 1000) {
      return errorResponse("Comment must be between 3 and 1000 characters", 400);
    }

    await connectDB();

    const review = await Review.findOne({ _id: reviewId, user: auth.userId });
    if (!review) {
      return errorResponse("Review not found", 404);
    }

    review.rating = rating;
    review.comment = comment;
    review.isHidden = false;
    review.hiddenReason = undefined;
    review.hiddenBy = undefined;
    await review.save();

    return successResponse(review, "Review updated");
  } catch (err) {
    console.error("PUT /api/user/reviews/[reviewId] error:", err);
    return errorResponse("Failed to update review", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { reviewId } = await params;
    if (!isValidObjectId(reviewId)) {
      return errorResponse("Invalid review ID", 400);
    }

    await connectDB();

    const deleted = await Review.findOneAndDelete({ _id: reviewId, user: auth.userId });
    if (!deleted) {
      return errorResponse("Review not found", 404);
    }

    return successResponse(null, "Review deleted");
  } catch (err) {
    console.error("DELETE /api/user/reviews/[reviewId] error:", err);
    return errorResponse("Failed to delete review", 500);
  }
}
