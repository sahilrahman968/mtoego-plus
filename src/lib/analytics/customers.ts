import User from "@/models/user.model";
import Order from "@/models/order.model";
import {
  LIST_LIMIT,
  ONE_AND_DONE_DAYS,
  PAID_STATUSES,
  VIP_LIMIT,
} from "@/lib/analytics/constants";
import { PeriodWindow } from "@/lib/analytics/periods";
import { median, round2, safeDivide } from "@/lib/analytics/format";
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

  return new Map(
    rows.map((r: CustomerLtv) => [r.userId, r])
  );
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
      newCustomers: { orders: 0, revenue: 0 },
      returningCustomers: { orders: 0, revenue: 0 },
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

  for (const o of paidInPeriod) {
    const uid = String(o.user);
    if (returningUsers.has(uid)) {
      retOrders += 1;
      retRevenue += o.pricing.grandTotal;
    } else {
      newOrders += 1;
      newRevenue += o.pricing.grandTotal;
    }
  }

  return {
    newCustomers: { orders: newOrders, revenue: round2(newRevenue) },
    returningCustomers: { orders: retOrders, revenue: round2(retRevenue) },
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
    .sort((a, b) => (a.lastOrderAt!.getTime() - b.lastOrderAt!.getTime()))
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
    const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
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
      // Don't compute future months
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
