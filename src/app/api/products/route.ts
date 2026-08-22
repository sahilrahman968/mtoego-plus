import { NextRequest } from "next/server";
import { Types, isValidObjectId } from "mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import Product from "@/models/product.model";
import { DEFAULT_GST_PERCENT } from "@/lib/pricing";

const SORTABLE_FIELDS = ["createdAt", "price"] as const;

// ─── GET /api/products — Public product listing ─────────────────────────────
// Only returns active products. Supports pagination, filtering, and search.

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;
    const sortParam = searchParams.get("sort") ?? "createdAt";
    const sort = (SORTABLE_FIELDS as readonly string[]).includes(sortParam)
      ? sortParam
      : "createdAt";
    const order = searchParams.get("order") === "asc" ? 1 : -1;

    // Base filter: only active products
    const filter: Record<string, unknown> = { isActive: true };

    // Optional filters
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      if (!isValidObjectId(categoryParam)) {
        return errorResponse("Invalid category", 400);
      }
      filter.category = new Types.ObjectId(categoryParam);
    }

    const featuredParam = searchParams.get("featured");
    if (featuredParam === "true") filter.isFeatured = true;

    const tagParam = searchParams.get("tag");
    if (tagParam) filter.tags = tagParam;

    const search = searchParams.get("search");
    if (search) {
      filter.$text = { $search: search };
    }

    // Price lives on `variants[]`, not on the product itself, so a plain
    // `.sort({ price })` has nothing to sort on. Rank by the same value the
    // storefront shows: the lowest active variant price, GST inclusive.
    const listProducts =
      sort === "price"
        ? Product.aggregate([
            { $match: filter },
            {
              $addFields: {
                lowestPrice: {
                  $ifNull: [
                    {
                      $min: {
                        $map: {
                          input: {
                            $filter: {
                              input: "$variants",
                              as: "v",
                              cond: { $ne: ["$$v.isActive", false] },
                            },
                          },
                          as: "v",
                          in: {
                            $multiply: [
                              "$$v.price",
                              {
                                $add: [
                                  1,
                                  {
                                    $divide: [
                                      { $ifNull: ["$$v.gst", DEFAULT_GST_PERCENT] },
                                      100,
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
              },
            },
            { $sort: { lowestPrice: order, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            {
              $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                __v: 0,
                lowestPrice: 0,
                "category.__v": 0,
                "category.description": 0,
                "category.image": 0,
                "category.createdAt": 0,
                "category.updatedAt": 0,
              },
            },
          ])
        : Product.find(filter)
            .populate("category", "name slug")
            .select("-__v")
            .sort({ [sort]: order })
            .skip(skip)
            .limit(limit)
            .lean();

    const [products, total] = await Promise.all([
      listProducts,
      Product.countDocuments(filter),
    ]);

    const { applySaleToProducts, loadLiveSaleIndex } = await import("@/lib/sales");
    const saleIndex = await loadLiveSaleIndex();

    return successResponse({
      items: applySaleToProducts(products as never[], saleIndex),
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
