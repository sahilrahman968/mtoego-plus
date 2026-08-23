import User from "@/models/user.model";
import Order from "@/models/order.model";
import {
  LIST_LIMIT,
  ONE_AND_DONE_DAYS,
  PAID_STATUSES,
  TOP_REVENUE_PERCENTILE,
  VIP_LIMIT,
} from "@/lib/analytics/constants";
import { PeriodWindow } from "@/lib/analytics/periods";
import { avg, median, round2, safeDivide } from "@/lib/analytics/format";
import { Types } from "mongoose";

interface CustomerLtv {
  userId: string;
  name: string;
  email: string;
  orderCount: number;
  ltv: number;
  firstOrderAt: Date | null;
  lastOrderAt: Date | null;
}

async function buildCustomerLtvMap(): Promise<Map<string, CustomerLtv>> {
  const rows = await Order.aggregate([
    { $match: { status: { $in: PAID_STATUSES } } },
    {
      $group: {
        _id: "$user",
        orderCount: { $sum: 1 },
        ltv: { $sum: "$pricing.grandTotal" },
        firstOrderAt: { $min: "$createdAt" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        userId: { $toString: "$_id" },
        name: { $ifNull: ["$user.name", "Deleted User"] },
        email: { $ifNull: ["$user.email", ""] },
        orderCount: 1,
        ltv: 1,
        firstOrderAt: 1,
        lastOrderAt: 1,
      },
    },
  ]);

  return new Map(rows.map((r: CustomerLtv) => [r.userId, r]));
}

function monthlyMarketingSpendInr(): number {
  const raw = process.env.ANALYTICS_MONTHLY_MARKETING_SPEND_INR;
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function getNewVsReturning(window: PeriodWindow) {
  const paidInPeriod = await Order.find({
    status: { $in: PAID_STATUSES },
    createdAt: { $gte: window.start, $lte: window.end },
  })
    .select("user pricing.grandTotal createdAt")
    .lean();

  if (paidInPeriod.length === 0) {
    return {
      newCustomers: { count: 0, orders: 0, revenue: 0 },
      returningCustomers: { count: 0, orders: 0, revenue: 0 },
    };
  }

  const userIds = [...new Set(paidInPeriod.map((o) => String(o.user)))];
  const priorOrders = await Order.find({
    user: { $in: userIds.map((id) => new Types.ObjectId(id)) },
    status: { $in: PAID_STATUSES },
    createdAt: { $lt: window.start },
  })
    .select("user")
    .lean();

  const returningUsers = new Set(priorOrders.map((o) => String(o.user)));

  let newOrders = 0;
  let newRevenue = 0;
  let retOrders = 0;
  let retRevenue = 0;
  const newUserIds = new Set<string>();
  const retUserIds = new Set<string>();

  for (const o of paidInPeriod) {
    const uid = String(o.user);
    if (returningUsers.has(uid)) {
      retOrders += 1;
      retRevenue += o.pricing.grandTotal;
      retUserIds.add(uid);
    } else {
      newOrders += 1;
      newRevenue += o.pricing.grandTotal;
      newUserIds.add(uid);
    }
  }

  return {
    newCustomers: {
      count: newUserIds.size,
      orders: newOrders,
      revenue: round2(newRevenue),
    },
    returningCustomers: {
      count: retUserIds.size,
      orders: retOrders,
      revenue: round2(retRevenue),
    },
  };
}

/**
 * Core customer-health KPIs: CLV, CAC, repeat rate, purchase cadence, CLV:CAC.
 * CAC uses optional ANALYTICS_MONTHLY_MARKETING_SPEND_INR prorated to the window.
 */
export async function getCustomerHealth(window: PeriodWindow) {
  const [ltvMap, newVsReturning, gapDays] = await Promise.all([
    buildCustomerLtvMap(),
    getNewVsReturning(window),
    getDaysBetweenPurchases(),
  ]);

  const buyers = [...ltvMap.values()];
  const buyerCount = buyers.length;
  const repeatBuyers = buyers.filter((b) => b.orderCount >= 2).length;
  const totalLtv = buyers.reduce((sum, b) => sum + b.ltv, 0);
  const totalOrders = buyers.reduce((sum, b) => sum + b.orderCount, 0);

  const clv = round2(safeDivide(totalLtv, buyerCount));
  const avgOrdersPerCustomer = round2(safeDivide(totalOrders, buyerCount));
  const repeatPurchaseRatePct = round2(
    safeDivide(repeatBuyers, buyerCount) * 100
  );

  const monthlySpend = monthlyMarketingSpendInr();
  const marketingSpendInPeriod =
    monthlySpend > 0
      ? round2(monthlySpend * (window.dayCount / 30))
      : null;
  const newCount = newVsReturning.newCustomers.count;
  const cac =
    marketingSpendInPeriod !== null && newCount > 0
      ? round2(safeDivide(marketingSpendInPeriod, newCount))
      : null;
  const clvCacRatio =
    cac !== null && cac > 0 ? round2(safeDivide(clv, cac)) : null;

  return {
    newCustomers: newVsReturning.newCustomers,
    returningCustomers: newVsReturning.returningCustomers,
    repeatPurchaseRatePct,
    clv,
    avgOrdersPerCustomer,
    medianDaysBetweenPurchases: gapDays.median,
    avgDaysBetweenPurchases: gapDays.avg,
    purchaseGapSampleSize: gapDays.sampleSize,
    marketingSpendInPeriod,
    cac,
    clvCacRatio,
    cacConfigured: monthlySpend > 0,
    buyers: buyerCount,
  };
}

async function getDaysBetweenPurchases() {
  const rows = await Order.aggregate([
    { $match: { status: { $in: PAID_STATUSES } } },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$user",
        dates: { $push: "$createdAt" },
      },
    },
    {
      $match: {
        "dates.1": { $exists: true },
      },
    },
  ]);

  const gaps: number[] = [];
  for (const row of rows as { dates: Date[] }[]) {
    const dates = row.dates
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);
    for (let i = 1; i < dates.length; i++) {
      const days = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
      if (Number.isFinite(days) && days >= 0) gaps.push(days);
    }
  }

  const med = median(gaps);
  const mean = avg(gaps);
  return {
    median: med !== null ? round2(med) : null,
    avg: mean !== null ? round2(mean) : null,
    sampleSize: gaps.length,
  };
}

/** Distinct paying customers by last known shipping location */
export async function getCustomersByLocation(limit = LIST_LIMIT) {
  const [byState, byCity] = await Promise.all([
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          state: { $first: "$shippingAddress.state" },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$state", "Unknown"] },
          customers: { $sum: 1 },
        },
      },
      { $sort: { customers: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          state: "$_id",
          customers: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$user",
          city: { $first: "$shippingAddress.city" },
          state: { $first: "$shippingAddress.state" },
        },
      },
      {
        $group: {
          _id: {
            city: { $ifNull: ["$city", "Unknown"] },
            state: { $ifNull: ["$state", "Unknown"] },
          },
          customers: { $sum: 1 },
        },
      },
      { $sort: { customers: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          city: "$_id.city",
          state: "$_id.state",
          customers: 1,
        },
      },
    ]),
  ]);

  return { byState, byCity };
}

/** Top revenue percentile of buyers (default top 10%) */
export async function getTopRevenueCustomers(
  percentile = TOP_REVENUE_PERCENTILE
) {
  const ltvMap = await buildCustomerLtvMap();
  const sorted = [...ltvMap.values()].sort((a, b) => b.ltv - a.ltv);
  const totalRevenue = sorted.reduce((sum, c) => sum + c.ltv, 0);
  const count =
    sorted.length === 0
      ? 0
      : Math.max(1, Math.ceil(sorted.length * percentile));
  const slice = sorted.slice(0, count);
  const revenue = slice.reduce((sum, c) => sum + c.ltv, 0);

  return {
    percentile: round2(percentile * 100),
    count: slice.length,
    buyerCount: sorted.length,
    revenue: round2(revenue),
    revenueSharePct: round2(safeDivide(revenue, totalRevenue) * 100),
    customers: slice.map((c) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      orderCount: c.orderCount,
      ltv: round2(c.ltv),
      lastOrderAt: c.lastOrderAt?.toISOString() || null,
    })),
  };
}

export async function getSignupToPurchase() {
  const [customers, buyersAgg, firstOrderDays] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      { $group: { _id: "$user" } },
      { $count: "count" },
    ]),
    Order.aggregate([
      { $match: { status: { $in: PAID_STATUSES } } },
      {
        $group: {
          _id: "$user",
          firstOrderAt: { $min: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          days: {
            $divide: [
              { $subtract: ["$firstOrderAt", "$user.createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    ]),
  ]);

  const buyers = buyersAgg[0]?.count || 0;
  const days = firstOrderDays
    .map((r: { days: number }) => r.days)
    .filter((d: number) => Number.isFinite(d) && d >= 0);
  const med = median(days);

  return {
    customers,
    buyers,
    conversionPct: round2(safeDivide(buyers, customers) * 100),
    medianDaysToFirstPurchase: med !== null ? round2(med) : null,
  };
}

export async function getLtvBands() {
  const ltvMap = await buildCustomerLtvMap();
  const customers = await User.find({ role: "customer" }).select("_id").lean();
  const bands = {
    "0": 0,
    "1-999": 0,
    "1k-5k": 0,
    "5k-20k": 0,
    "20k+": 0,
  };

  for (const c of customers) {
    const ltv = ltvMap.get(String(c._id))?.ltv || 0;
    if (ltv <= 0) bands["0"] += 1;
    else if (ltv < 1000) bands["1-999"] += 1;
    else if (ltv < 5000) bands["1k-5k"] += 1;
    else if (ltv < 20000) bands["5k-20k"] += 1;
    else bands["20k+"] += 1;
  }

  return Object.entries(bands).map(([band, count]) => ({ band, count }));
}

export async function getVipList(limit = VIP_LIMIT) {
  const ltvMap = await buildCustomerLtvMap();
  return [...ltvMap.values()]
    .sort((a, b) => b.ltv - a.ltv)
    .slice(0, limit)
    .map((c) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      orderCount: c.orderCount,
      ltv: round2(c.ltv),
      lastOrderAt: c.lastOrderAt?.toISOString() || null,
    }));
}

export async function getOneAndDone(limit = LIST_LIMIT) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ONE_AND_DONE_DAYS);
  const ltvMap = await buildCustomerLtvMap();

  return [...ltvMap.values()]
    .filter(
      (c) =>
        c.orderCount === 1 &&
        c.lastOrderAt !== null &&
        c.lastOrderAt < cutoff
    )
    .sort((a, b) => a.lastOrderAt!.getTime() - b.lastOrderAt!.getTime())
    .slice(0, limit)
    .map((c) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      ltv: round2(c.ltv),
      lastOrderAt: c.lastOrderAt!.toISOString(),
    }));
}

export async function getNeverOrdered(limit = LIST_LIMIT) {
  const buyerIds = await Order.distinct("user", {
    status: { $in: PAID_STATUSES },
  });
  const never = await User.find({
    role: "customer",
    _id: { $nin: buyerIds },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("name email createdAt")
    .lean();

  return never.map((u) => ({
    userId: String(u._id),
    name: u.name,
    email: u.email || "",
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getSignupChannelMix() {
  const customers = await User.find({ role: "customer" })
    .select("+password googleId email phone isPhoneVerified")
    .lean();

  let google = 0;
  let emailPassword = 0;
  let phoneOnly = 0;
  let other = 0;

  for (const u of customers) {
    if (u.googleId) {
      google += 1;
    } else if (u.email && u.password) {
      emailPassword += 1;
    } else if (u.phone && u.isPhoneVerified) {
      phoneOnly += 1;
    } else {
      other += 1;
    }
  }

  return [
    { channel: "Google", count: google },
    { channel: "Email / password", count: emailPassword },
    { channel: "Phone verified", count: phoneOnly },
    { channel: "Other", count: other },
  ];
}

/**
 * Simple cohort: last 6 signup months × retention months 0,1,2
 * (% of cohort with ≥1 paid order in that relative month)
 */
export async function getCohortRetention(monthsBack = 6) {
  const now = new Date();
  const cohorts: {
    cohort: string;
    size: number;
    m0: number | null;
    m1: number | null;
    m2: number | null;
  }[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const cohortEnd = new Date(
      now.getFullYear(),
      now.getMonth() - i + 1,
      0,
      23,
      59,
      59,
      999
    );
    const label = cohortStart.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });

    const users = await User.find({
      role: "customer",
      createdAt: { $gte: cohortStart, $lte: cohortEnd },
    })
      .select("_id")
      .lean();

    const size = users.length;
    if (size === 0) {
      cohorts.push({ cohort: label, size: 0, m0: null, m1: null, m2: null });
      continue;
    }

    const userIds = users.map((u) => u._id);
    const orders = await Order.find({
      user: { $in: userIds },
      status: { $in: PAID_STATUSES },
    })
      .select("user createdAt")
      .lean();

    const retentionFor = (offset: number) => {
      const mStart = new Date(
        cohortStart.getFullYear(),
        cohortStart.getMonth() + offset,
        1
      );
      const mEnd = new Date(
        cohortStart.getFullYear(),
        cohortStart.getMonth() + offset + 1,
        0,
        23,
        59,
        59,
        999
      );
      if (mStart > now) return null;
      const buyers = new Set(
        orders
          .filter((o) => o.createdAt >= mStart && o.createdAt <= mEnd)
          .map((o) => String(o.user))
      );
      return round2(safeDivide(buyers.size, size) * 100);
    };

    cohorts.push({
      cohort: label,
      size,
      m0: retentionFor(0),
      m1: retentionFor(1),
      m2: retentionFor(2),
    });
  }

  return cohorts;
}
