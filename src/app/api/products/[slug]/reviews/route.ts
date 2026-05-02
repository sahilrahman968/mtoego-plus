import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { isValidSlug } from "@/lib/validators";
import Product from "@/models/product.model";
import Review from "@/models/review.model";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const page = Math.max(1, Number(_request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(
      20,
      Math.max(1, Number(_request.nextUrl.searchParams.get("limit") ?? 5))
    );
    const skip = (page - 1) * limit;

    if (!isValidSlug(slug)) {
      return errorResponse("Invalid product slug", 400);
    }

    await connectDB();

    const product = await Product.findOne({ slug, isActive: true }).select("_id").lean();
    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const baseFilter = { product: product._id, isHidden: { $ne: true } };
    const [reviews, totalReviews] = await Promise.all([
      Review.find(baseFilter)
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(baseFilter),
    ]);

    const allVisibleReviews = await Review.find(baseFilter).select("rating").lean();

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of allVisibleReviews) {
      totalRating += review.rating;
      ratingBreakdown[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }

    const averageRating = totalReviews > 0 ? Number((totalRating / totalReviews).toFixed(1)) : 0;

    return successResponse({
      items: reviews.map((review) => ({
        _id: String(review._id),
        rating: review.rating,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt,
        user: {
          id:
            typeof review.user === "object" &&
            review.user &&
            "_id" in review.user &&
            review.user._id
              ? String(review.user._id)
              : "",
          name:
            typeof review.user === "object" &&
            review.user &&
            "name" in review.user &&
            typeof review.user.name === "string"
              ? review.user.name
              : "Verified buyer",
        },
      })),
      stats: {
        averageRating,
        totalReviews,
        ratingBreakdown,
      },
      page,
      limit,
      totalPages: Math.ceil(totalReviews / limit),
      hasNextPage: page * limit < totalReviews,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("GET /api/products/[slug]/reviews error:", err);
    return errorResponse("Failed to fetch reviews", 500);
  }
}
