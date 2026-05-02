import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Product from "@/models/product.model";
import Order from "@/models/order.model";
import Review from "@/models/review.model";

interface ReviewBody {
  productId?: unknown;
  rating?: unknown;
  comment?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = (await request.json()) as ReviewBody;

    const productId = typeof body.productId === "string" ? body.productId : "";
    const rating =
      typeof body.rating === "number" && Number.isInteger(body.rating) ? body.rating : null;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isValidObjectId(productId)) {
      return errorResponse("Invalid product ID", 400);
    }
    if (!rating || rating < 1 || rating > 5) {
      return errorResponse("Rating must be an integer between 1 and 5", 400);
    }
    if (comment.length < 3 || comment.length > 1000) {
      return errorResponse("Comment must be between 3 and 1000 characters", 400);
    }

    await connectDB();

    const product = await Product.findOne({ _id: productId, isActive: true }).select("_id");
    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const deliveredOrder = await Order.findOne({
      user: auth.userId,
      status: "delivered",
      "items.product": productId,
    }).select("_id");

    if (!deliveredOrder) {
      return errorResponse("Only delivered purchases can be reviewed", 403);
    }

    const existingReview = await Review.findOne({
      product: productId,
      user: auth.userId,
    });

    if (existingReview) {
      existingReview.rating = rating;
      existingReview.comment = comment;
      await existingReview.save();
      return successResponse(existingReview, "Review updated");
    }

    const review = await Review.create({
      product: productId,
      user: auth.userId,
      rating,
      comment,
      isVerifiedPurchase: true,
    });

    return successResponse(review, "Review submitted", 201);
  } catch (err) {
    console.error("POST /api/user/reviews error:", err);
    return errorResponse("Failed to submit review", 500);
  }
}
