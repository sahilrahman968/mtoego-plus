import Cart from "@/models/cart.model";
import Wishlist from "@/models/wishlist.model";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import {
  ABANDON_HOURS,
  LIST_LIMIT,
  PAID_STATUSES,
  PRICE_DRIFT_THRESHOLD,
} from "@/lib/analytics/constants";
import { PeriodWindow } from "@/lib/analytics/periods";
import { round2 } from "@/lib/analytics/format";
import { Types } from "mongoose";

function abandonCutoff(now = new Date()) {
  return new Date(now.getTime() - ABANDON_HOURS * 60 * 60 * 1000);
}

interface LeanCart {
  _id: Types.ObjectId;
  user: Types.ObjectId | { _id: Types.ObjectId; name?: string; email?: string };
  items: {
    product: Types.ObjectId;
    variant: Types.ObjectId;
    quantity: number;
    priceAtAdd: number;
    addedAt: Date;
  }[];
  updatedAt: Date;
}

async function loadCandidateCarts(): Promise<LeanCart[]> {
  const cutoff = abandonCutoff();
  return Cart.find({
    "items.0": { $exists: true },
    updatedAt: { $lte: cutoff },
  })
    .populate("user", "name email")
    .lean() as Promise<LeanCart[]>;
}

async function filterAbandoned(carts: LeanCart[]): Promise<LeanCart[]> {
  if (carts.length === 0) return [];

  const userIds = carts.map((c) =>
    typeof c.user === "object" && c.user && "_id" in c.user
      ? c.user._id
      : (c.user as Types.ObjectId)
  );

  const paidOrders = await Order.find({
    user: { $in: userIds },
    status: { $in: PAID_STATUSES },
  })
    .select("user createdAt")
    .lean();

  const latestPaidByUser = new Map<string, Date>();
  for (const o of paidOrders) {
    const uid = String(o.user);
    const prev = latestPaidByUser.get(uid);
    if (!prev || o.createdAt > prev) {
      latestPaidByUser.set(uid, o.createdAt);
    }
  }

  return carts.filter((cart) => {
    const uid =
      typeof cart.user === "object" && cart.user && "_id" in cart.user
        ? String(cart.user._id)
        : String(cart.user);
    const lastPaid = latestPaidByUser.get(uid);
    if (!lastPaid) return true;
    return lastPaid < cart.updatedAt;
  });
}

function cartValue(cart: LeanCart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity * i.priceAtAdd, 0);
}

function cartAgeHours(cart: LeanCart, now = new Date()): number {
  return (now.getTime() - new Date(cart.updatedAt).getTime()) / (1000 * 60 * 60);
}

export async function getAbandonedCartSummary() {
  const candidates = await loadCandidateCarts();
  const abandoned = await filterAbandoned(candidates);
  const value = abandoned.reduce((sum, c) => sum + cartValue(c), 0);
  return {
    count: abandoned.length,
    value: round2(value),
  };
}

export async function getAbandonmentAgeBuckets() {
  // Age distribution for non-empty carts (intent aging). Abandonment filter
  // still applies so paid-after-update carts are excluded.
  const allNonEmpty = (await Cart.find({ "items.0": { $exists: true } }).lean()) as LeanCart[];
  const carts = await filterAbandoned(allNonEmpty);

  const buckets = [
    { key: "0-1d", label: "0–1 days", minH: 0, maxH: 24, value: 0, count: 0 },
    { key: "1-3d", label: "1–3 days", minH: 24, maxH: 72, value: 0, count: 0 },
    { key: "3-7d", label: "3–7 days", minH: 72, maxH: 168, value: 0, count: 0 },
    { key: "7d+", label: "7+ days", minH: 168, maxH: Infinity, value: 0, count: 0 },
  ];

  for (const cart of carts) {
    const hours = cartAgeHours(cart);
    const value = cartValue(cart);
    const bucket = buckets.find((b) => hours >= b.minH && hours < b.maxH);
    if (bucket) {
      bucket.value += value;
      bucket.count += 1;
    }
  }

  return buckets.map(({ key, label, value, count }) => ({
    key,
    label,
    value: round2(value),
    count,
  }));
}

export async function getAbandonedCartsToRecover(limit = LIST_LIMIT) {
  const candidates = await loadCandidateCarts();
  const abandoned = await filterAbandoned(candidates);

  const sorted = abandoned
    .map((cart) => {
      const user =
        typeof cart.user === "object" && cart.user && "name" in cart.user
          ? {
              _id: String(cart.user._id),
              name: cart.user.name || "N/A",
              email: cart.user.email || "",
            }
          : { _id: String(cart.user), name: "Unknown", email: "" };
      return {
        cartId: String(cart._id),
        user,
        value: round2(cartValue(cart)),
        itemCount: cart.items.length,
        ageHours: round2(cartAgeHours(cart)),
        updatedAt: cart.updatedAt.toISOString(),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

  return sorted;
}

export async function getTopAbandonedProducts(limit = LIST_LIMIT) {
  const candidates = await loadCandidateCarts();
  const abandoned = await filterAbandoned(candidates);

  const map = new Map<
    string,
    { productId: string; quantity: number; value: number; cartCount: number }
  >();

  for (const cart of abandoned) {
    const seen = new Set<string>();
    for (const item of cart.items) {
      const pid = String(item.product);
      const prev = map.get(pid) || {
        productId: pid,
        quantity: 0,
        value: 0,
        cartCount: 0,
      };
      prev.quantity += item.quantity;
      prev.value += item.quantity * item.priceAtAdd;
      if (!seen.has(pid)) {
        prev.cartCount += 1;
        seen.add(pid);
      }
      map.set(pid, prev);
    }
  }

  const productIds = [...map.keys()].map((id) => new Types.ObjectId(id));
  const products = await Product.find({ _id: { $in: productIds } })
    .select("title")
    .lean();
  const titleMap = new Map(products.map((p) => [String(p._id), p.title]));

  return [...map.values()]
    .map((r) => ({
      ...r,
      title: titleMap.get(r.productId) || "Unknown product",
      value: round2(r.value),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function getWishlistRankings(limit = 50) {
  const rows = await Wishlist.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        wishlistCount: { $sum: 1 },
      },
    },
    { $sort: { wishlistCount: -1 } },
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
        wishlistCount: 1,
      },
    },
  ]);
  return rows;
}

export async function getHighWishlistLowSales(
  salesByProduct: Map<string, { units: number; revenue: number; title: string }>,
  limit = LIST_LIMIT
) {
  const rankings = await getWishlistRankings(100);
  return rankings
    .map((w: { productId: string; title: string; wishlistCount: number }) => {
      const sales = salesByProduct.get(w.productId);
      const unitsSold = sales?.units || 0;
      return {
        productId: w.productId,
        title: w.title,
        wishlistCount: w.wishlistCount,
        unitsSold,
        revenue: sales?.revenue || 0,
      };
    })
    .filter((r) => r.wishlistCount >= 3 && r.unitsSold < r.wishlistCount)
    .sort((a, b) => b.wishlistCount - a.wishlistCount || a.unitsSold - b.unitsSold)
    .slice(0, limit);
}

export async function getPriceDriftCarts(limit = LIST_LIMIT) {
  const carts = await Cart.find({ "items.0": { $exists: true } })
    .populate("user", "name email")
    .lean() as LeanCart[];

  const productIds = [
    ...new Set(carts.flatMap((c) => c.items.map((i) => String(i.product)))),
  ].map((id) => new Types.ObjectId(id));

  const products = await Product.find({ _id: { $in: productIds } })
    .select("title variants")
    .lean();

  const variantPrice = new Map<string, { price: number; title: string }>();
  for (const p of products) {
    for (const v of p.variants || []) {
      variantPrice.set(String(v._id), { price: v.price, title: p.title });
    }
  }

  const drifts: {
    user: { _id: string; name: string; email: string };
    productId: string;
    title: string;
    priceAtAdd: number;
    currentPrice: number;
    driftPct: number;
  }[] = [];

  for (const cart of carts) {
    const user =
      typeof cart.user === "object" && cart.user && "name" in cart.user
        ? {
            _id: String(cart.user._id),
            name: cart.user.name || "N/A",
            email: cart.user.email || "",
          }
        : { _id: String(cart.user), name: "Unknown", email: "" };

    for (const item of cart.items) {
      const current = variantPrice.get(String(item.variant));
      if (!current || current.price <= 0) continue;
      const drift = Math.abs(current.price - item.priceAtAdd) / current.price;
      if (drift >= PRICE_DRIFT_THRESHOLD) {
        drifts.push({
          user,
          productId: String(item.product),
          title: current.title,
          priceAtAdd: item.priceAtAdd,
          currentPrice: current.price,
          driftPct: round2(drift * 100),
        });
      }
    }
  }

  return drifts.sort((a, b) => b.driftPct - a.driftPct).slice(0, limit);
}

/** Wishlist→purchase: products wishlisted that also appear in paid orders in window */
export async function getWishlistPurchaseOverlap(window: PeriodWindow) {
  const [wishlisted, purchased] = await Promise.all([
    Wishlist.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.product" } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      { $unwind: "$items" },
      { $group: { _id: "$items.product" } },
    ]),
  ]);

  const wishSet = new Set(wishlisted.map((r: { _id: unknown }) => String(r._id)));
  const purchasedIds = purchased.map((r: { _id: unknown }) => String(r._id));
  const overlap = purchasedIds.filter((id) => wishSet.has(id)).length;

  return {
    wishlistedProducts: wishSet.size,
    purchasedProducts: purchasedIds.length,
    overlapProducts: overlap,
  };
}
