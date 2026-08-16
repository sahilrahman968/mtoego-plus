import Order from "@/models/order.model";
import {
  PAID_STATUSES,
  LIST_LIMIT,
  STUCK_ORDER_DAYS,
} from "@/lib/analytics/constants";
import { PeriodWindow, eachDayLabel } from "@/lib/analytics/periods";
import { avg, median, round2, safeDivide } from "@/lib/analytics/format";

export interface OrderWindowTotals {
  revenue: number;
  orders: number;
  aov: number;
  discount: number;
  subtotalAfterDiscount: number;
  paidCount: number;
  cancelledUnpaidCount: number;
  cancelledCount: number;
  cancelledRevenue: number;
  refundedCount: number;
  refundedRevenue: number;
  pendingCount: number;
  pendingRevenue: number;
}

async function totalsForRange(start: Date, end: Date): Promise<OrderWindowTotals> {
  const [paidAgg, cancelledUnpaid, cancelled, refunded, pending] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
          discount: { $sum: "$pricing.discount" },
          subtotalAfterDiscount: { $sum: "$pricing.subtotalAfterDiscount" },
        },
      },
    ]),
    Order.countDocuments({
      status: "cancelled",
      createdAt: { $gte: start, $lte: end },
      $or: [
        { "payment.paidAt": { $exists: false } },
        { "payment.paidAt": null },
      ],
    }),
    Order.aggregate([
      {
        $match: {
          status: "cancelled",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "refunded",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "pending",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          revenue: { $sum: "$pricing.grandTotal" },
        },
      },
    ]),
  ]);

  const paid = paidAgg[0] || {
    revenue: 0,
    orders: 0,
    discount: 0,
    subtotalAfterDiscount: 0,
  };
  const cancel = cancelled[0] || { count: 0, revenue: 0 };
  const refund = refunded[0] || { count: 0, revenue: 0 };
  const pend = pending[0] || { count: 0, revenue: 0 };

  return {
    revenue: paid.revenue || 0,
    orders: paid.orders || 0,
    aov: safeDivide(paid.revenue || 0, paid.orders || 0),
    discount: paid.discount || 0,
    subtotalAfterDiscount: paid.subtotalAfterDiscount || 0,
    paidCount: paid.orders || 0,
    cancelledUnpaidCount: cancelledUnpaid,
    cancelledCount: cancel.count || 0,
    cancelledRevenue: cancel.revenue || 0,
    refundedCount: refund.count || 0,
    refundedRevenue: refund.revenue || 0,
    pendingCount: pend.count || 0,
    pendingRevenue: pend.revenue || 0,
  };
}

export async function getOrderTotalsForWindows(window: PeriodWindow) {
  const [current, previous] = await Promise.all([
    totalsForRange(window.start, window.end),
    totalsForRange(window.prevStart, window.prevEnd),
  ]);
  return { current, previous };
}

export function paymentSuccessRate(t: OrderWindowTotals): number {
  const denom = t.paidCount + t.cancelledUnpaidCount;
  return safeDivide(t.paidCount, denom) * 100;
}

export function cancelRate(t: OrderWindowTotals): number {
  const denom = t.paidCount + t.cancelledCount + t.refundedCount;
  return safeDivide(t.cancelledCount, denom) * 100;
}

export function refundRate(t: OrderWindowTotals): number {
  const denom = t.paidCount + t.cancelledCount + t.refundedCount;
  return safeDivide(t.refundedCount, denom) * 100;
}

export async function getDailyOrderSeries(window: PeriodWindow) {
  const useWeekly = window.dayCount > 90;

  const agg = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    {
      $group: {
        _id: useWeekly
          ? {
              $dateToString: { format: "%Y-%U", date: "$createdAt" },
            }
          : {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
        revenue: { $sum: "$pricing.grandTotal" },
        orders: { $sum: 1 },
        discount: { $sum: "$pricing.discount" },
        subtotal: { $sum: "$pricing.subtotal" },
        bucketStart: { $min: "$createdAt" },
      },
    },
    { $sort: { bucketStart: 1 } },
  ]);

  if (useWeekly) {
    return agg.map(
      (r: {
        _id: string;
        revenue: number;
        orders: number;
        discount: number;
        subtotal: number;
        bucketStart: Date;
      }) => {
        const revenue = r.revenue || 0;
        const orders = r.orders || 0;
        const start = new Date(r.bucketStart);
        return {
          date: r._id,
          label: start.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          }),
          revenue,
          orders,
          aov: round2(safeDivide(revenue, orders)),
          discount: r.discount || 0,
          subtotal: r.subtotal || 0,
        };
      }
    );
  }

  const byDate = new Map(
    agg.map((r: { _id: string; revenue: number; orders: number; discount: number; subtotal: number }) => [
      r._id,
      r,
    ])
  );

  return eachDayLabel(window.start, window.dayCount).map(({ date, label }) => {
    const row = byDate.get(date);
    const revenue = row?.revenue || 0;
    const orders = row?.orders || 0;
    return {
      date,
      label,
      revenue,
      orders,
      aov: round2(safeDivide(revenue, orders)),
      discount: row?.discount || 0,
      subtotal: row?.subtotal || 0,
    };
  });
}

export async function getWeeklyPaymentSuccess(window: PeriodWindow) {
  const [paid, cancelledUnpaid] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%U", date: "$createdAt" },
          },
          paid: { $sum: 1 },
          weekStart: { $min: "$createdAt" },
        },
      },
      { $sort: { weekStart: 1 } },
    ]),
    Order.aggregate([
      {
        $match: {
          status: "cancelled",
          createdAt: { $gte: window.start, $lte: window.end },
          $or: [
            { "payment.paidAt": { $exists: false } },
            { "payment.paidAt": null },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%U", date: "$createdAt" },
          },
          failed: { $sum: 1 },
          weekStart: { $min: "$createdAt" },
        },
      },
    ]),
  ]);

  const failedMap = new Map(
    cancelledUnpaid.map((r: { _id: string; failed: number }) => [r._id, r.failed])
  );

  return paid.map((r: { _id: string; paid: number; weekStart: Date }) => {
    const failed = failedMap.get(r._id) || 0;
    const total = r.paid + failed;
    return {
      week: r._id,
      label: new Date(r.weekStart).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      paid: r.paid,
      failed,
      successRate: round2(safeDivide(r.paid, total) * 100),
    };
  });
}

export async function getOrdersByStatus(start?: Date, end?: Date) {
  const match: Record<string, unknown> = {};
  if (start && end) {
    match.createdAt = { $gte: start, $lte: end };
  }
  const agg = await Order.aggregate([
    ...(Object.keys(match).length ? [{ $match: match }] : []),
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const ordersByStatus: Record<string, number> = {};
  for (const row of agg) {
    ordersByStatus[row._id] = row.count;
  }
  return ordersByStatus;
}

export async function getMonthlyRevenue(monthsBack = 11) {
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack, 1);
  start.setHours(0, 0, 0, 0);

  const monthlyRevenueAgg = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: start },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$pricing.grandTotal" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const now = new Date();
  const monthlyRevenue: {
    month: string;
    year: number;
    revenue: number;
    orders: number;
  }[] = [];

  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const found = monthlyRevenueAgg.find(
      (m: { _id: { year: number; month: number } }) =>
        m._id.year === year && m._id.month === month
    );
    monthlyRevenue.push({
      month: months[d.getMonth()],
      year,
      revenue: found ? found.revenue : 0,
      orders: found ? found.orders : 0,
    });
  }

  return monthlyRevenue;
}

export async function getTopProducts(window: PeriodWindow, limit = LIST_LIMIT) {
  return Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        title: { $first: "$items.title" },
        revenue: { $sum: "$items.total" },
        units: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        productId: { $toString: "$_id" },
        title: 1,
        revenue: 1,
        units: 1,
      },
    },
  ]);
}

export async function getTopCategories(window: PeriodWindow, limit = LIST_LIMIT) {
  return Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productDoc",
      },
    },
    { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "productDoc.category",
        foreignField: "_id",
        as: "categoryDoc",
      },
    },
    { $unwind: { path: "$categoryDoc", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$productDoc.category",
        name: { $first: { $ifNull: ["$categoryDoc.name", "Uncategorized"] } },
        revenue: { $sum: "$items.total" },
        units: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        categoryId: {
          $cond: [
            { $ifNull: ["$_id", false] },
            { $toString: "$_id" },
            null,
          ],
        },
        name: 1,
        revenue: 1,
        units: 1,
      },
    },
  ]);
}

export async function getUnitsSoldByProduct(window: PeriodWindow) {
  const rows = await Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        units: { $sum: "$items.quantity" },
        revenue: { $sum: "$items.total" },
        title: { $first: "$items.title" },
      },
    },
  ]);
  return new Map(
    rows.map((r: { _id: unknown; units: number; revenue: number; title: string }) => [
      String(r._id),
      { units: r.units, revenue: r.revenue, title: r.title },
    ])
  );
}

export async function getCancelReasonBreakdown(window: PeriodWindow) {
  return Order.aggregate([
    {
      $match: {
        status: "cancelled",
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$cancelReason", "Unspecified"] },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.grandTotal" },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        reason: "$_id",
        count: 1,
        revenue: 1,
      },
    },
  ]);
}

export async function getPaymentMethodMix(window: PeriodWindow) {
  return Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$payment.method", "unknown"] },
        count: { $sum: 1 },
        revenue: { $sum: "$pricing.grandTotal" },
      },
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        method: "$_id",
        count: 1,
        revenue: 1,
      },
    },
  ]);
}

export async function getCouponPerformance(window: PeriodWindow) {
  return Order.aggregate([
    {
      $match: {
        status: { $in: PAID_STATUSES },
        createdAt: { $gte: window.start, $lte: window.end },
        "coupon.code": { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: "$coupon.code",
        uses: { $sum: 1 },
        discountGiven: { $sum: "$coupon.discountAmount" },
        gmv: { $sum: "$pricing.grandTotal" },
      },
    },
    { $sort: { uses: -1 } },
    { $limit: LIST_LIMIT },
    {
      $lookup: {
        from: "coupons",
        localField: "_id",
        foreignField: "code",
        as: "couponDoc",
      },
    },
    {
      $project: {
        _id: 0,
        code: "$_id",
        uses: 1,
        discountGiven: 1,
        gmv: 1,
        usageLimit: {
          $ifNull: [{ $arrayElemAt: ["$couponDoc.usageLimit", 0] }, null],
        },
        usedCount: {
          $ifNull: [{ $arrayElemAt: ["$couponDoc.usedCount", 0] }, null],
        },
      },
    },
  ]);
}

export async function getGeoRevenue(window: PeriodWindow, limit = LIST_LIMIT) {
  const [byState, byCity] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      {
        $group: {
          _id: "$shippingAddress.state",
          revenue: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          state: "$_id",
          revenue: 1,
          orders: 1,
        },
      },
    ]),
    Order.aggregate([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          createdAt: { $gte: window.start, $lte: window.end },
        },
      },
      {
        $group: {
          _id: {
            city: "$shippingAddress.city",
            state: "$shippingAddress.state",
          },
          revenue: { $sum: "$pricing.grandTotal" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          city: "$_id.city",
          state: "$_id.state",
          revenue: 1,
          orders: 1,
        },
      },
    ]),
  ]);
  return { byState, byCity };
}

function findStatusTime(
  history: { status: string; timestamp: Date }[],
  status: string
): Date | null {
  const entry = history.find((h) => h.status === status);
  return entry ? new Date(entry.timestamp) : null;
}

export async function getFulfillmentSla(window: PeriodWindow) {
  const orders = await Order.find({
    status: { $in: [...PAID_STATUSES, "delivered"] },
    createdAt: { $gte: window.start, $lte: window.end },
    statusHistory: { $exists: true, $ne: [] },
  })
    .select("statusHistory status createdAt")
    .lean();

  const paidToProcessing: number[] = [];
  const processingToShipped: number[] = [];
  const shippedToDelivered: number[] = [];

  for (const order of orders) {
    const history = (order.statusHistory || []) as {
      status: string;
      timestamp: Date;
    }[];
    const paidAt = findStatusTime(history, "paid");
    const processingAt = findStatusTime(history, "processing");
    const shippedAt = findStatusTime(history, "shipped");
    const deliveredAt = findStatusTime(history, "delivered");

    if (paidAt && processingAt) {
      paidToProcessing.push(
        (processingAt.getTime() - paidAt.getTime()) / (1000 * 60 * 60)
      );
    }
    if (processingAt && shippedAt) {
      processingToShipped.push(
        (shippedAt.getTime() - processingAt.getTime()) / (1000 * 60 * 60)
      );
    }
    if (shippedAt && deliveredAt) {
      shippedToDelivered.push(
        (deliveredAt.getTime() - shippedAt.getTime()) / (1000 * 60 * 60)
      );
    }
  }

  const summarize = (vals: number[]) => ({
    avgHours: avg(vals) !== null ? round2(avg(vals)!) : null,
    medianHours: median(vals) !== null ? round2(median(vals)!) : null,
    sampleSize: vals.length,
  });

  return {
    paidToProcessing: summarize(paidToProcessing),
    processingToShipped: summarize(processingToShipped),
    shippedToDelivered: summarize(shippedToDelivered),
  };
}

export async function getStuckOrders(limit = LIST_LIMIT) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STUCK_ORDER_DAYS);

  const orders = await Order.find({
    status: { $in: ["paid", "processing"] },
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate("user", "name email")
    .select("orderNumber status pricing.grandTotal createdAt user")
    .lean();

  return orders.map((o) => ({
    _id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    grandTotal: o.pricing.grandTotal,
    createdAt: o.createdAt.toISOString(),
    ageDays: Math.floor(
      (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    ),
    user: o.user
      ? {
          name: (o.user as { name?: string }).name || "N/A",
          email: (o.user as { email?: string }).email || "",
        }
      : { name: "Deleted User", email: "" },
  }));
}

export async function getRecentOrders(limit = 5) {
  const recentOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("user", "name email")
    .lean();

  return recentOrders.map((order) => ({
    _id: String(order._id),
    orderNumber: order.orderNumber,
    user: order.user
      ? {
          name: (order.user as { name?: string }).name || "N/A",
          email: (order.user as { email?: string }).email || "",
        }
      : { name: "Deleted User", email: "" },
    status: order.status,
    grandTotal: order.pricing.grandTotal,
    createdAt: order.createdAt.toISOString(),
  }));
}
