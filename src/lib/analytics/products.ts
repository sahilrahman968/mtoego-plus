import Product from "@/models/product.model";
import Order from "@/models/order.model";
import {
  DEAD_STOCK_DAYS,
  LIST_LIMIT,
  LOW_STOCK_THRESHOLD,
  PAID_STATUSES,
} from "@/lib/analytics/constants";
import { PeriodWindow } from "@/lib/analytics/periods";

export async function getProductActiveCounts() {
  const [active, inactive, total] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: false }),
    Product.countDocuments(),
  ]);
  return { active, inactive, total };
}

export async function getLowStockCount() {
  const rows = await Product.aggregate([
    { $match: { isActive: true } },
    { $unwind: "$variants" },
    {
      $match: {
        "variants.isActive": true,
        "variants.stock": { $lte: LOW_STOCK_THRESHOLD },
      },
    },
    { $count: "count" },
  ]);
  return rows[0]?.count || 0;
}

export async function getLowStockBestsellers(
  window: PeriodWindow,
  limit = LIST_LIMIT
) {
  const sold = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: {
          product: "$items.product",
          variant: "$items.variant",
        },
        title: { $first: "$items.title" },
        variantLabel: { $first: "$items.variantLabel" },
        sku: { $first: "$items.sku" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.total" },
      },
    },
    { $sort: { unitsSold: -1 } },
  ]);

  if (sold.length === 0) return [];

  const productIds = [
    ...new Set(sold.map((s: { _id: { product: unknown } }) => String(s._id.product))),
  ];
  const products = await Product.find({
    _id: { $in: productIds },
  })
    .select("title variants images")
    .lean();

  const stockMap = new Map<string, number>();
  const imageMap = new Map<string, string | null>();
  for (const p of products) {
    imageMap.set(String(p._id), p.images?.[0]?.url ?? null);
    for (const v of p.variants || []) {
      stockMap.set(`${p._id}:${v._id}`, v.stock);
    }
  }

  const result: {
    productId: string;
    variantId: string;
    title: string;
    imageUrl: string | null;
    variantLabel: string;
    sku: string;
    unitsSold: number;
    revenue: number;
    stock: number;
  }[] = [];

  for (const s of sold as {
    _id: { product: unknown; variant: unknown };
    title: string;
    variantLabel: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }[]) {
    const key = `${s._id.product}:${s._id.variant}`;
    const stock = stockMap.get(key);
    if (stock === undefined || stock > LOW_STOCK_THRESHOLD) continue;
    result.push({
      productId: String(s._id.product),
      variantId: String(s._id.variant),
      title: s.title,
      imageUrl: imageMap.get(String(s._id.product)) ?? null,
      variantLabel: s.variantLabel || "",
      sku: s.sku,
      unitsSold: s.unitsSold,
      revenue: s.revenue,
      stock,
    });
    if (result.length >= limit) break;
  }

  return result;
}

export async function getDeadStock(limit = LIST_LIMIT) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DEAD_STOCK_DAYS);

  const soldProductIds = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: cutoff },
      },
    },
    { $unwind: "$items" },
    { $group: { _id: "$items.product" } },
  ]);
  const soldSet = new Set(
    soldProductIds.map((r: { _id: unknown }) => String(r._id))
  );

  const products = await Product.find({ isActive: true })
    .select("title variants isActive images")
    .lean();

  const dead: {
    productId: string;
    title: string;
    imageUrl: string | null;
    stock: number;
  }[] = [];
  for (const p of products) {
    const totalStock = (p.variants || []).reduce(
      (sum, v) => sum + (v.isActive ? v.stock : 0),
      0
    );
    if (totalStock <= 0) continue;
    if (soldSet.has(String(p._id))) continue;
    dead.push({
      productId: String(p._id),
      title: p.title,
      imageUrl: p.images?.[0]?.url ?? null,
      stock: totalStock,
    });
    if (dead.length >= limit) break;
  }

  return dead;
}
