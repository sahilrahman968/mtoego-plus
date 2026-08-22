import { Types, type PipelineStage } from "mongoose";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import { getTopProducts } from "@/lib/analytics/orders";
import { getDeadStock } from "@/lib/analytics/products";
import {
  getTopAbandonedProducts,
  getWishlistRankings,
} from "@/lib/analytics/cart-wishlist";
import { DEAD_STOCK_DAYS } from "@/lib/analytics/constants";
import type { PeriodWindow } from "@/lib/analytics/periods";

export const SALE_COLLECTION_LIMIT = 40;
const LOW_STOCK_TOTAL = 10;

export const SALE_PRODUCT_COLLECTIONS = [
  {
    key: "featured",
    label: "Featured",
    description: "Homepage merchandising picks — already treated as hero SKUs.",
  },
  {
    key: "new_arrivals",
    label: "New arrivals",
    description: "Most recently listed products — launch pricing and first-look cuts.",
  },
  {
    key: "bestsellers",
    label: "Bestsellers",
    description: "Top sellers in the last 90 days — proven demand for flash volume.",
  },
  {
    key: "slow_movers",
    label: "Slow movers",
    description: `In stock with no paid sales in ${DEAD_STOCK_DAYS} days — clearance recovery.`,
  },
  {
    key: "overstock",
    label: "Overstock",
    description: "Highest on-hand units — move inventory with a timed campaign.",
  },
  {
    key: "last_chance",
    label: "Last chance",
    description: "Low remaining stock — scarcity and urgency merchandising.",
  },
  {
    key: "premium",
    label: "Premium",
    description: "Highest priced active products — prestige or hero-and-halo sales.",
  },
  {
    key: "wishlist",
    label: "Wishlist demand",
    description: "Most wishlisted products — convert saved intent into orders.",
  },
  {
    key: "abandoned",
    label: "Abandoned carts",
    description: "SKUs sitting in abandoned carts — recover with a timed cut.",
  },
] as const;

export type SaleCollectionKey = (typeof SALE_PRODUCT_COLLECTIONS)[number]["key"];

const COLLECTION_KEYS = new Set<string>(SALE_PRODUCT_COLLECTIONS.map((c) => c.key));

export function isSaleCollectionKey(value: string): value is SaleCollectionKey {
  return COLLECTION_KEYS.has(value);
}

const PRODUCT_SELECT = "title slug images variants isActive isFeatured category";

function lastDaysWindow(days: number): PeriodWindow {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return {
    period: "custom",
    label: `Last ${days} days`,
    start,
    end,
    prevStart: start,
    prevEnd: end,
    dayCount: days,
  };
}

async function hydrateProducts(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => Types.ObjectId.isValid(id)))];
  if (unique.length === 0) return [];

  const products = await Product.find({
    _id: { $in: unique },
    isActive: true,
  })
    .select(PRODUCT_SELECT)
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));
  return unique.map((id) => byId.get(id)).filter(Boolean);
}

function stockExpr() {
  return {
    $sum: {
      $map: {
        input: {
          $filter: {
            input: { $ifNull: ["$variants", []] },
            as: "v",
            cond: { $ne: ["$$v.isActive", false] },
          },
        },
        as: "v",
        in: { $ifNull: ["$$v.stock", 0] },
      },
    },
  };
}

function minPriceExpr() {
  return {
    $min: {
      $map: {
        input: {
          $filter: {
            input: { $ifNull: ["$variants", []] },
            as: "v",
            cond: { $ne: ["$$v.isActive", false] },
          },
        },
        as: "v",
        in: { $ifNull: ["$$v.price", 0] },
      },
    },
  };
}

async function aggregateIds(
  extraStages: PipelineStage[],
  sort: Record<string, 1 | -1>
) {
  const pipeline: PipelineStage[] = [
    { $match: { isActive: true } },
    { $addFields: { _stock: stockExpr(), _minPrice: minPriceExpr() } },
    ...extraStages,
    { $sort: sort },
    { $limit: SALE_COLLECTION_LIMIT },
    { $project: { _id: 1 } },
  ];
  const rows = await Product.aggregate<{ _id: Types.ObjectId }>(pipeline);
  return rows.map((r) => String(r._id));
}

export async function listSaleProductCollections() {
  const categories = await Category.find({ isActive: true })
    .select("name")
    .sort({ name: 1 })
    .lean();

  return {
    collections: SALE_PRODUCT_COLLECTIONS.map((c) => ({ ...c })),
    categories: categories.map((c) => ({ _id: String(c._id), name: c.name })),
  };
}

export async function getSaleCollectionProducts(options: {
  collection: SaleCollectionKey | "category";
  categoryId?: string;
}) {
  const { collection, categoryId } = options;
  let ids: string[] = [];
  let meta =
    collection === "category"
      ? {
          key: "category" as const,
          label: "Category",
          description: "Active products in this category.",
        }
      : SALE_PRODUCT_COLLECTIONS.find((c) => c.key === collection)!;

  if (collection === "featured") {
    const products = await Product.find({ isActive: true, isFeatured: true })
      .select(PRODUCT_SELECT)
      .sort({ updatedAt: -1 })
      .limit(SALE_COLLECTION_LIMIT)
      .lean();
    return { ...meta, items: products };
  }

  if (collection === "new_arrivals") {
    const products = await Product.find({ isActive: true })
      .select(PRODUCT_SELECT)
      .sort({ createdAt: -1 })
      .limit(SALE_COLLECTION_LIMIT)
      .lean();
    return { ...meta, items: products };
  }

  if (collection === "bestsellers") {
    const top = await getTopProducts(lastDaysWindow(90), SALE_COLLECTION_LIMIT);
    ids = top.map((row: { productId: string }) => row.productId);
  } else if (collection === "slow_movers") {
    const dead = await getDeadStock(SALE_COLLECTION_LIMIT);
    ids = dead.map((row) => row.productId);
  } else if (collection === "overstock") {
    ids = await aggregateIds([{ $match: { _stock: { $gt: 0 } } }], { _stock: -1 });
  } else if (collection === "last_chance") {
    ids = await aggregateIds(
      [{ $match: { _stock: { $gt: 0, $lte: LOW_STOCK_TOTAL } } }],
      { _stock: 1 }
    );
  } else if (collection === "premium") {
    ids = await aggregateIds([{ $match: { _minPrice: { $gt: 0 } } }], {
      _minPrice: -1,
    });
  } else if (collection === "wishlist") {
    const ranked = await getWishlistRankings(SALE_COLLECTION_LIMIT);
    ids = ranked.map((row: { productId: string }) => row.productId);
  } else if (collection === "abandoned") {
    const abandoned = await getTopAbandonedProducts(SALE_COLLECTION_LIMIT);
    ids = abandoned.map((row) => row.productId);
  } else if (collection === "category") {
    if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
      return { ...meta, items: [] };
    }
    const category = await Category.findById(categoryId).select("name").lean();
    if (category) {
      meta = {
        key: "category",
        label: category.name,
        description: `Active products in ${category.name}.`,
      };
    }
    const products = await Product.find({
      isActive: true,
      category: categoryId,
    })
      .select(PRODUCT_SELECT)
      .sort({ createdAt: -1 })
      .limit(SALE_COLLECTION_LIMIT)
      .lean();
    return { ...meta, items: products };
  }

  return { ...meta, items: await hydrateProducts(ids) };
}
