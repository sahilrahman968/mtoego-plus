import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import { campaignStatus } from "@/lib/sales";
import {
  ensureProductPriceBaseline,
} from "@/lib/product-price-history";
import {
  activeSaleCampaignsForProduct,
  buildEffectivePriceHistory,
  buildEffectivePriceTimeline,
  buildSingleVariantPriceTimeline,
  currentEffectivePrices,
  getVariantPricing,
  labelVariant,
} from "@/lib/product-price-timeline";
import Product from "@/models/product.model";
import ProductPriceHistory from "@/models/product-price-history.model";
import SaleCampaign from "@/models/sale-campaign.model";
import Order from "@/models/order.model";
import Review from "@/models/review.model";
import Cart from "@/models/cart.model";
import Wishlist from "@/models/wishlist.model";

type RouteContext = { params: Promise<{ id: string }> };

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];
const TREND_DAYS = 30;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function buildSalesTrend(
  trendStart: Date,
  trendByDate: Map<string, { units: number; revenue: number; orders: number }>
) {
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const day = new Date(trendStart);
    day.setDate(trendStart.getDate() + index);
    const key = day.toISOString().slice(0, 10);
    const row = trendByDate.get(key);
    return {
      label: formatDayLabel(day),
      date: key,
      units: row?.units ?? 0,
      revenue: row?.revenue ?? 0,
      orders: row?.orders ?? 0,
    };
  });
}

function serializePriceHistory(
  entries: ReturnType<typeof buildEffectivePriceHistory>
) {
  return entries.map((entry) => ({
    _id: entry._id,
    variantId: String(entry.variant),
    variantLabel: entry.variantLabel,
    sku: entry.sku,
    price: entry.price,
    gst: entry.gst,
    compareAtPrice: entry.compareAtPrice,
    priceInclGst: entry.priceInclGst,
    effectiveAt: entry.effectiveAt,
    source: entry.source,
    changedBy: entry.changedBy,
    saleTitle: entry.saleTitle,
    saleSlug: entry.saleSlug,
    originalPrice: entry.originalPrice,
    originalPriceInclGst: entry.originalPriceInclGst,
  }));
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(_request, "products.view");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const product = await Product.findById(id)
      .populate("category", "name slug")
      .lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const productObjectId = new Types.ObjectId(id);
    const trendStart = startOfDay(
      new Date(Date.now() - (TREND_DAYS - 1) * 24 * 60 * 60 * 1000)
    );

    await ensureProductPriceBaseline(
      productObjectId,
      product.variants,
      product.createdAt
    );

    const [
      paidAgg,
      variantPerf,
      dailyTrend,
      dailyTrendByVariant,
      reviewAgg,
      cartAgg,
      cartByVariant,
      wishlistCount,
      wishlistByVariant,
      priceHistory,
      saleCampaigns,
      recentOrders,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.product": productObjectId,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: null,
            orders: { $addToSet: "$_id" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        {
          $project: {
            _id: 0,
            orders: { $size: "$orders" },
            units: 1,
            revenue: 1,
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.product": productObjectId,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: "$items.variant",
            variantLabel: { $first: "$items.variantLabel" },
            sku: { $first: "$items.sku" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
            orders: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            variantId: "$_id",
            variantLabel: 1,
            sku: 1,
            units: 1,
            revenue: 1,
            orders: { $size: "$orders" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.product": productObjectId,
            createdAt: { $gte: trendStart },
          },
        },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
            orders: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            date: "$_id",
            units: 1,
            revenue: 1,
            orders: { $size: "$orders" },
          },
        },
        { $sort: { date: 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.product": productObjectId,
            createdAt: { $gte: trendStart },
          },
        },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              variant: "$items.variant",
            },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
            orders: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            date: "$_id.date",
            variantId: "$_id.variant",
            units: 1,
            revenue: 1,
            orders: { $size: "$orders" },
          },
        },
        { $sort: { date: 1 } },
      ]),
      Review.aggregate([
        { $match: { product: productObjectId, isHidden: false } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ]),
      Cart.aggregate([
        { $match: { "items.product": productObjectId } },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: null,
            carts: { $addToSet: "$_id" },
            units: { $sum: "$items.quantity" },
          },
        },
        {
          $project: {
            _id: 0,
            carts: { $size: "$carts" },
            units: 1,
          },
        },
      ]),
      Cart.aggregate([
        { $match: { "items.product": productObjectId } },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: "$items.variant",
            carts: { $addToSet: "$_id" },
            units: { $sum: "$items.quantity" },
          },
        },
        {
          $project: {
            variantId: "$_id",
            carts: { $size: "$carts" },
            units: 1,
          },
        },
      ]),
      Wishlist.countDocuments({ "items.product": productObjectId }),
      Wishlist.aggregate([
        { $match: { "items.product": productObjectId } },
        { $unwind: "$items" },
        { $match: { "items.product": productObjectId } },
        {
          $group: {
            _id: "$items.variant",
            count: { $sum: 1 },
          },
        },
      ]),
      ProductPriceHistory.find({ product: productObjectId })
        .sort({ effectiveAt: 1, createdAt: 1 })
        .lean(),
      SaleCampaign.find({ "items.product": productObjectId })
        .sort({ startsAt: 1 })
        .select("title slug startsAt endsAt isActive priority items")
        .lean(),
      Order.find({
        status: { $in: PAID_STATUSES },
        "items.product": productObjectId,
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .select(
          "orderNumber status pricing.grandTotal createdAt items.title items.quantity items.variant items.variantLabel items.total items.product"
        )
        .lean(),
    ]);

    const paid = paidAgg[0] || { orders: 0, units: 0, revenue: 0 };
    const reviews = reviewAgg[0] || { count: 0, avgRating: 0 };
    const inCarts = cartAgg[0] || { carts: 0, units: 0 };

    const activeVariants = product.variants.filter((v) => v.isActive !== false);
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

    const baseHistory = priceHistory.map((entry) => ({
      _id: entry._id,
      effectiveAt: entry.effectiveAt,
      price: entry.price,
      gst: entry.gst,
      variant: entry.variant,
      variantLabel: entry.variantLabel,
      sku: entry.sku,
      compareAtPrice: entry.compareAtPrice,
      source: entry.source as "initial" | "update",
      changedBy: entry.changedBy,
    }));

    const effectivePriceHistory = buildEffectivePriceHistory(
      id,
      product.variants,
      baseHistory,
      saleCampaigns
    );
    const priceTimeline = buildEffectivePriceTimeline(
      id,
      product.variants,
      effectivePriceHistory
    );
    const pricing = currentEffectivePrices(id, product.variants, saleCampaigns);
    const liveSales = activeSaleCampaignsForProduct(id, saleCampaigns);
    const serializedPriceHistory = serializePriceHistory(effectivePriceHistory);

    const trendByDate = new Map(
      dailyTrend.map((row: { date: string; units: number; revenue: number; orders: number }) => [
        row.date,
        row,
      ])
    );
    const salesTrend = buildSalesTrend(trendStart, trendByDate);

    const perfByVariant = new Map(
      variantPerf.map(
        (row: {
          variantId: Types.ObjectId;
          variantLabel: string;
          sku: string;
          units: number;
          revenue: number;
          orders: number;
        }) => [String(row.variantId), row]
      )
    );

    const cartByVariantMap = new Map(
      cartByVariant.map(
        (row: { variantId: Types.ObjectId; carts: number; units: number }) => [
          String(row.variantId),
          row,
        ]
      )
    );

    const wishlistByVariantMap = new Map(
      wishlistByVariant.map((row: { _id: Types.ObjectId | null; count: number }) => [
        row._id ? String(row._id) : "product",
        row.count,
      ])
    );

    const variantTrendMaps = new Map<string, Map<string, { units: number; revenue: number; orders: number }>>();
    for (const row of dailyTrendByVariant as {
      date: string;
      variantId: Types.ObjectId;
      units: number;
      revenue: number;
      orders: number;
    }[]) {
      const variantId = String(row.variantId);
      if (!variantTrendMaps.has(variantId)) {
        variantTrendMaps.set(variantId, new Map());
      }
      variantTrendMaps.get(variantId)!.set(row.date, {
        units: row.units,
        revenue: row.revenue,
        orders: row.orders,
      });
    }

    const variantInsights = product.variants.map((variant) => {
      const variantId = String(variant._id);
      const perf = perfByVariant.get(variantId);
      const cartStats = cartByVariantMap.get(variantId);
      const variantPricing = getVariantPricing(variant, id, saleCampaigns);
      const variantPriceHistory = serializedPriceHistory.filter(
        (entry) => entry.variantId === variantId
      );

      return {
        variantId,
        variantLabel: labelVariant(variant),
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        stock: variant.stock,
        isActive: variant.isActive !== false,
        pricing: variantPricing,
        counters: {
          orders: perf?.orders ?? 0,
          unitsSold: perf?.units ?? 0,
          revenue: perf?.revenue ?? 0,
          avgOrderValue:
            perf && perf.orders > 0 ? perf.revenue / perf.orders : 0,
          cartUnits: cartStats?.units ?? 0,
          cartsWithVariant: cartStats?.carts ?? 0,
          wishlistCount: wishlistByVariantMap.get(variantId) ?? 0,
          revenueShare:
            paid.revenue > 0 ? Math.round(((perf?.revenue ?? 0) / paid.revenue) * 1000) / 10 : 0,
          unitsShare:
            paid.units > 0 ? Math.round(((perf?.units ?? 0) / paid.units) * 1000) / 10 : 0,
        },
        salesTrend: buildSalesTrend(
          trendStart,
          variantTrendMaps.get(variantId) ?? new Map()
        ),
        priceTimeline: buildSingleVariantPriceTimeline(variantId, effectivePriceHistory),
        priceHistory: variantPriceHistory,
      };
    });

    const priceTimelinePoints = priceTimeline;

    const serializedRecentOrders = recentOrders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      pricing: order.pricing,
      createdAt: order.createdAt,
      productLines: (order.items || [])
        .filter((item: { product?: Types.ObjectId }) => String(item.product) === id)
        .map(
          (item: {
            variant?: Types.ObjectId;
            variantLabel?: string;
            title?: string;
            quantity?: number;
            total?: number;
          }) => ({
            variantId: item.variant ? String(item.variant) : null,
            variantLabel: item.variantLabel || "",
            title: item.title || "",
            quantity: item.quantity || 0,
            total: item.total || 0,
          })
        ),
    }));

    return successResponse({
      product: {
        _id: product._id,
        title: product.title,
        slug: product.slug,
        description: product.description,
        category: product.category,
        images: product.images,
        variants: product.variants,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        tags: product.tags,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
      inventory: {
        totalStock,
        variantCount: product.variants.length,
        activeVariantCount: activeVariants.length,
        currentMinPrice: pricing.minPrice,
        currentMaxPrice: pricing.maxPrice,
        onSale: pricing.onSale,
      },
      activeSales: liveSales.map((campaign) => {
        const item = campaign.items.find((entry) => String(entry.product) === id);
        return {
          _id: campaign._id,
          title: campaign.title,
          slug: campaign.slug,
          startsAt: campaign.startsAt,
          endsAt: campaign.endsAt,
          status: campaignStatus(campaign),
          discountType: item?.discountType,
          discountValue: item?.value,
        };
      }),
      counters: {
        orders: paid.orders,
        unitsSold: paid.units,
        revenue: paid.revenue,
        avgOrderValue: paid.orders > 0 ? paid.revenue / paid.orders : 0,
        reviewCount: reviews.count,
        avgRating: reviews.count > 0 ? Math.round(reviews.avgRating * 10) / 10 : 0,
        wishlistCount,
        cartsWithProduct: inCarts.carts,
        cartUnits: inCarts.units,
      },
      variantPerformance: variantPerf,
      variantInsights,
      salesTrend,
      priceTimeline: priceTimelinePoints,
      priceHistory: serializedPriceHistory,
      recentOrders: serializedRecentOrders,
    });
  } catch (err) {
    console.error("GET /api/admin/products/:id/analytics error:", err);
    return errorResponse("Failed to load product analytics", 500);
  }
}
