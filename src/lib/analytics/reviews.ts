import Review from "@/models/review.model";
import Product from "@/models/product.model";
import { LIST_LIMIT } from "@/lib/analytics/constants";
import { PeriodWindow } from "@/lib/analytics/periods";
import { round2, safeDivide } from "@/lib/analytics/format";

export async function getReviewSummary(window: PeriodWindow) {
  const [periodAgg, distribution, coverage] = await Promise.all([
    Review.aggregate([
      {
        $match: {
          isHidden: false,
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]),
    Review.aggregate([
      {
        $match: {
          isHidden: false,
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    (async () => {
      const [totalProducts, reviewed] = await Promise.all([
        Product.countDocuments({ isActive: true }),
        Review.distinct("product", { isHidden: false }),
      ]);
      return {
        totalProducts,
        reviewedProducts: reviewed.length,
        coveragePct: round2(safeDivide(reviewed.length, totalProducts) * 100),
      };
    })(),
  ]);

  const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const row of distribution) {
    dist[String(row._id)] = row.count;
  }

  return {
    avgRating: periodAgg[0] ? round2(periodAgg[0].avgRating) : null,
    count: periodAgg[0]?.count || 0,
    distribution: dist,
    coverage,
  };
}

export async function getLowRatedProducts(limit = LIST_LIMIT) {
  return Review.aggregate([
    { $match: { isHidden: false } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gte: 3 }, avgRating: { $lte: 2 } } },
    { $sort: { avgRating: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productId: { $toString: "$_id" },
        title: { $ifNull: ["$product.title", "Unknown product"] },
        avgRating: { $round: ["$avgRating", 2] },
        count: 1,
      },
    },
  ]);
}
