"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PeriodSelection,
  buildPeriodQuery,
} from "@/lib/analytics/periods";
import { MetricWithDelta } from "@/lib/analytics/format";
import StatsCard from "@/app/admin/components/StatsCard";
import InfoTooltip from "@/app/admin/components/InfoTooltip";
import PeriodToggle from "./components/PeriodToggle";
import AnalyticsSection from "./components/AnalyticsSection";
import AnalyticsTable, {
  ProductLink,
  OrderLink,
} from "./components/AnalyticsTable";
import {
  DailyRevenueChart,
  OrdersAovChart,
  GrossVsDiscountChart,
  FunnelChart,
  AbandonmentAgeChart,
  PaymentSuccessChart,
  SimpleBarList,
} from "./components/Charts";

function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function MetricTile({
  label,
  value,
  info,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  info: string;
  hint?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-visible">
      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        {label}
        <InfoTooltip text={info} />
      </p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {hint}
    </div>
  );
}

function trendFromDelta(deltaPct: number | null | undefined) {
  if (deltaPct === null || deltaPct === undefined) return undefined;
  return {
    value: `${deltaPct}% vs prior`,
    positive: deltaPct >= 0,
  };
}

function useAnalyticsFetch<T>(endpoint: string, selection: PeriodSelection) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryKey = buildPeriodQuery(selection);

  const load = useCallback(async () => {
    if (selection.period === "custom" && (!selection.from || !selection.to)) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/${endpoint}?${queryKey}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load");
      }
      setData(json.data as T);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [endpoint, queryKey, selection.period, selection.from, selection.to]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error };
}

interface PulseData {
  metrics: {
    revenue: MetricWithDelta;
    orders: MetricWithDelta;
    aov: MetricWithDelta;
    paymentSuccessPct: MetricWithDelta;
    discount: MetricWithDelta;
    netAfterDiscount: MetricWithDelta;
    pendingRevenue: { value: number; count: number };
    cancelRatePct: MetricWithDelta;
    refundRatePct: MetricWithDelta;
    abandonedCart: { count: number; value: number };
    lowStockCount: number;
    openCallbacks: number;
    products: { active: number; inactive: number; total: number };
  };
}

interface CurvesData {
  daily: {
    label: string;
    revenue: number;
    orders: number;
    aov: number;
    discount: number;
    subtotal: number;
  }[];
  ordersByStatus: Record<string, number>;
  weeklyPayment: {
    label: string;
    paid: number;
    failed: number;
    successRate: number;
  }[];
  abandonmentAge: { label: string; value: number; count: number }[];
}

interface MerchData {
  topProducts: { productId: string; title: string; revenue: number; units: number }[];
  topCategories: { categoryId: string | null; name: string; revenue: number; units: number }[];
  highWishlistLowSales: {
    productId: string;
    title: string;
    wishlistCount: number;
    unitsSold: number;
  }[];
  abandonedCarts: {
    cartId: string;
    user: { name: string; email: string };
    value: number;
    itemCount: number;
    ageHours: number;
  }[];
  topAbandonedProducts: {
    productId: string;
    title: string;
    quantity: number;
    value: number;
    cartCount: number;
  }[];
  lowStockBestsellers: {
    productId: string;
    title: string;
    sku: string;
    unitsSold: number;
    stock: number;
  }[];
  deadStock: { productId: string; title: string; stock: number }[];
  priceDriftCarts: {
    productId: string;
    title: string;
    priceAtAdd: number;
    currentPrice: number;
    driftPct: number;
    user: { name: string; email: string };
  }[];
  wishlistOverlap: {
    wishlistedProducts: number;
    purchasedProducts: number;
    overlapProducts: number;
  };
}

interface TrustData {
  sla: {
    paidToProcessing: { avgHours: number | null; medianHours: number | null; sampleSize: number };
    processingToShipped: { avgHours: number | null; medianHours: number | null; sampleSize: number };
    shippedToDelivered: { avgHours: number | null; medianHours: number | null; sampleSize: number };
  };
  stuckOrders: {
    _id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    ageDays: number;
    user: { name: string };
  }[];
  cancels: {
    count: number;
    revenue: number;
    ratePct: number;
    reasons: { reason: string; count: number; revenue: number }[];
  };
  refunds: { count: number; revenue: number; ratePct: number };
  coupons: {
    code: string;
    uses: number;
    discountGiven: number;
    gmv: number;
    usageLimit: number | null;
    usedCount: number | null;
  }[];
  paymentMethods: { method: string; count: number; revenue: number }[];
  geo: {
    byState: { state: string; revenue: number; orders: number }[];
    byCity: { city: string; state: string; revenue: number; orders: number }[];
  };
  reviews: {
    avgRating: number | null;
    count: number;
    distribution: Record<string, number>;
    coverage: { totalProducts: number; reviewedProducts: number; coveragePct: number };
    lowRatedProducts: { productId: string; title: string; avgRating: number; count: number }[];
  };
}

interface CustomersData {
  newVsReturning: {
    newCustomers: { orders: number; revenue: number };
    returningCustomers: { orders: number; revenue: number };
  };
  signupToPurchase: {
    customers: number;
    buyers: number;
    conversionPct: number;
    medianDaysToFirstPurchase: number | null;
  };
  ltvBands: { band: string; count: number }[];
  vipList: { userId: string; name: string; email: string; orderCount: number; ltv: number }[];
  oneAndDone: { userId: string; name: string; email: string; ltv: number; lastOrderAt: string }[];
  neverOrdered: { userId: string; name: string; email: string; createdAt: string }[];
  signupChannels: { channel: string; count: number }[];
  cohorts: {
    cohort: string;
    size: number;
    m0: number | null;
    m1: number | null;
    m2: number | null;
  }[];
  callbacks: {
    byStatus: Record<string, number>;
    openCount: number;
    contactLatency: {
      avgHours: number | null;
      medianHours: number | null;
      sampleSize: number;
    };
    openRequests: {
      _id: string;
      requirement: string;
      phone: string;
      ageHours: number;
      createdAt: string;
    }[];
  };
}

const iconBox = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default function AnalyticsClient() {
  const [selection, setSelection] = useState<PeriodSelection>({ period: "30d" });

  const pulse = useAnalyticsFetch<PulseData>("pulse", selection);
  const curves = useAnalyticsFetch<CurvesData>("curves", selection);
  const merch = useAnalyticsFetch<MerchData>("merchandising", selection);
  const trust = useAnalyticsFetch<TrustData>("trust", selection);
  const customers = useAnalyticsFetch<CustomersData>("customers", selection);

  const m = pulse.data?.metrics;

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Growth, intent, ops, and customer insights
          </p>
        </div>
        <PeriodToggle value={selection} onChange={setSelection} />
      </div>

      {/* Tier A — Pulse */}
      <AnalyticsSection
        title="Pulse"
        description="Key metrics vs the previous equal period"
        loading={pulse.loading}
        error={pulse.error}
      >
        {m && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Revenue"
              value={formatCurrency(m.revenue.value)}
              color="emerald"
              icon={iconBox}
              trend={trendFromDelta(m.revenue.deltaPct)}
              info="Total paid order revenue in the selected period, compared with the previous equal period."
            />
            <StatsCard
              title="Orders"
              value={m.orders.value.toLocaleString()}
              color="indigo"
              icon={iconBox}
              trend={trendFromDelta(m.orders.deltaPct)}
              info="Count of paid orders placed in the selected period."
            />
            <StatsCard
              title="AOV"
              value={formatCurrency(m.aov.value)}
              color="amber"
              icon={iconBox}
              trend={trendFromDelta(m.aov.deltaPct)}
              info="Average order value — revenue divided by paid orders in the selected period."
            />
            <StatsCard
              title="Payment success"
              value={`${m.paymentSuccessPct.value.toFixed(1)}%`}
              color="rose"
              icon={iconBox}
              trend={trendFromDelta(m.paymentSuccessPct.deltaPct)}
              info="Share of checkout attempts that completed payment successfully (paid vs cancelled unpaid)."
            />
            <StatsCard
              title="Net after discount"
              value={formatCurrency(m.netAfterDiscount.value)}
              color="emerald"
              icon={iconBox}
              trend={trendFromDelta(m.netAfterDiscount.deltaPct)}
              info="Merchandise subtotal after discounts on paid orders (before shipping/tax adjustments)."
            />
            <StatsCard
              title="Pending payment"
              value={formatCurrency(m.pendingRevenue.value)}
              color="amber"
              icon={iconBox}
              trend={{ value: `${m.pendingRevenue.count} orders`, positive: true }}
              info="Value of orders that are still awaiting payment and have not been cancelled."
            />
            <StatsCard
              title="Abandoned carts"
              value={formatCurrency(m.abandonedCart.value)}
              color="rose"
              icon={iconBox}
              trend={{ value: `${m.abandonedCart.count} carts`, positive: false }}
              info="Estimated value of non-empty carts that never converted to a paid order."
            />
            <StatsCard
              title="Low-stock SKUs"
              value={m.lowStockCount}
              color="amber"
              icon={iconBox}
              info="Number of product variants currently at or below the low-stock threshold."
            />
            <StatsCard
              title="Cancel rate"
              value={`${m.cancelRatePct.value.toFixed(1)}%`}
              color="rose"
              icon={iconBox}
              trend={trendFromDelta(m.cancelRatePct.deltaPct)}
              info="Percentage of orders that were cancelled during the selected period."
            />
            <StatsCard
              title="Refund rate"
              value={`${m.refundRatePct.value.toFixed(1)}%`}
              color="rose"
              icon={iconBox}
              trend={trendFromDelta(m.refundRatePct.deltaPct)}
              info="Percentage of paid orders that were refunded during the selected period."
            />
            <StatsCard
              title="Open callbacks"
              value={m.openCallbacks}
              color="indigo"
              icon={iconBox}
              info="Customisation / callback requests that are still open and need follow-up."
            />
            <StatsCard
              title="Active products"
              value={`${m.products.active} / ${m.products.total}`}
              color="indigo"
              icon={iconBox}
              info="Active catalog products versus the total product count (active + inactive)."
            />
          </div>
        )}
      </AnalyticsSection>

      {/* Tier B — Curves */}
      <AnalyticsSection
        title="Curves"
        description="Trends and funnels for the selected period"
        loading={curves.loading}
        error={curves.error}
      >
        {curves.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyRevenueChart data={curves.data.daily} />
            <OrdersAovChart data={curves.data.daily} />
            <GrossVsDiscountChart data={curves.data.daily} />
            <FunnelChart ordersByStatus={curves.data.ordersByStatus} />
            <AbandonmentAgeChart data={curves.data.abandonmentAge} />
            <PaymentSuccessChart data={curves.data.weeklyPayment} />
          </div>
        )}
      </AnalyticsSection>

      {/* Tier C — Merchandising */}
      <AnalyticsSection
        title="Merchandising"
        description="What to promote, restock, and recover"
        loading={merch.loading}
        error={merch.error}
      >
        {merch.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricTile
                label="Wishlisted products"
                value={merch.data.wishlistOverlap.wishlistedProducts}
                info="Distinct products currently present on at least one customer wishlist."
              />
              <MetricTile
                label="Purchased products"
                value={merch.data.wishlistOverlap.purchasedProducts}
                info="Distinct products that appeared on paid orders in the selected period."
              />
              <MetricTile
                label="Wishlist ∩ purchased"
                value={merch.data.wishlistOverlap.overlapProducts}
                info="Products that are both on a wishlist and were purchased in the selected period."
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsTable
                title="Top products by revenue"
                info="Highest-revenue products from paid orders in the selected period."
                rows={merch.data.topProducts}
                rowKey={(r) => r.productId}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  { key: "units", header: "Units", align: "right", render: (r) => r.units },
                  {
                    key: "revenue",
                    header: "Revenue",
                    align: "right",
                    render: (r) => formatCurrency(r.revenue),
                  },
                ]}
              />
              <AnalyticsTable
                title="Top categories"
                info="Categories ranked by revenue from paid orders in the selected period."
                rows={merch.data.topCategories}
                rowKey={(r) => r.categoryId || r.name}
                columns={[
                  { key: "name", header: "Category", render: (r) => r.name },
                  { key: "units", header: "Units", align: "right", render: (r) => r.units },
                  {
                    key: "revenue",
                    header: "Revenue",
                    align: "right",
                    render: (r) => formatCurrency(r.revenue),
                  },
                ]}
              />
              <AnalyticsTable
                title="High wishlist, low sales"
                info="Products with strong wishlist interest but few units sold — candidates to promote or discount."
                rows={merch.data.highWishlistLowSales}
                rowKey={(r) => r.productId}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  { key: "wish", header: "Wishlist", align: "right", render: (r) => r.wishlistCount },
                  { key: "sold", header: "Sold", align: "right", render: (r) => r.unitsSold },
                ]}
              />
              <AnalyticsTable
                title="Abandoned carts to recover"
                info="Non-empty carts that never converted — prioritize outreach by age and cart value."
                rows={merch.data.abandonedCarts}
                rowKey={(r) => r.cartId}
                columns={[
                  {
                    key: "user",
                    header: "Customer",
                    render: (r) => (
                      <div>
                        <p className="font-medium">{r.user.name}</p>
                        <p className="text-xs text-slate-500">{r.user.email}</p>
                      </div>
                    ),
                  },
                  { key: "items", header: "Items", align: "right", render: (r) => r.itemCount },
                  {
                    key: "age",
                    header: "Age",
                    align: "right",
                    render: (r) => `${Math.round(r.ageHours)}h`,
                  },
                  {
                    key: "value",
                    header: "Value",
                    align: "right",
                    render: (r) => formatCurrency(r.value),
                  },
                ]}
              />
              <AnalyticsTable
                title="Top abandoned products"
                info="Products that appear most often in abandoned carts, ranked by estimated cart value."
                rows={merch.data.topAbandonedProducts}
                rowKey={(r) => r.productId}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  { key: "carts", header: "Carts", align: "right", render: (r) => r.cartCount },
                  {
                    key: "value",
                    header: "Value",
                    align: "right",
                    render: (r) => formatCurrency(r.value),
                  },
                ]}
              />
              <AnalyticsTable
                title="Low-stock bestsellers"
                info="Top-selling variants that are running low on stock and may need restocking soon."
                rows={merch.data.lowStockBestsellers}
                rowKey={(r) => `${r.productId}-${r.sku}`}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  { key: "sku", header: "SKU", render: (r) => r.sku },
                  { key: "sold", header: "Sold", align: "right", render: (r) => r.unitsSold },
                  { key: "stock", header: "Stock", align: "right", render: (r) => r.stock },
                ]}
              />
              <AnalyticsTable
                title="Dead stock (60d no sales)"
                info="In-stock products with no paid sales in the last 60 days — review for markdown or delisting."
                rows={merch.data.deadStock}
                rowKey={(r) => r.productId!}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId!} label={r.title!} />,
                  },
                  { key: "stock", header: "Stock", align: "right", render: (r) => r.stock },
                ]}
              />
              <AnalyticsTable
                title="Price-drift carts (≥5%)"
                info="Active carts where the current price differs by 5% or more from the price when the item was added."
                rows={merch.data.priceDriftCarts}
                rowKey={(r) => `${r.productId}-${r.user.email}-${r.driftPct}`}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  {
                    key: "user",
                    header: "Customer",
                    render: (r) => r.user.name,
                  },
                  {
                    key: "prices",
                    header: "Add → Now",
                    align: "right",
                    render: (r) =>
                      `${formatCurrency(r.priceAtAdd)} → ${formatCurrency(r.currentPrice)}`,
                  },
                  {
                    key: "drift",
                    header: "Drift",
                    align: "right",
                    render: (r) => `${r.driftPct}%`,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </AnalyticsSection>

      {/* Tier D — Trust */}
      <AnalyticsSection
        title="Ops & trust"
        description="Fulfillment, leakage, coupons, reviews, and geo"
        loading={trust.loading}
        error={trust.error}
      >
        {trust.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  [
                    "Paid → Processing",
                    trust.data.sla.paidToProcessing,
                    "Median hours from paid to processing for orders that completed this step in the period.",
                  ],
                  [
                    "Processing → Shipped",
                    trust.data.sla.processingToShipped,
                    "Median hours from processing to shipped for orders that completed this step in the period.",
                  ],
                  [
                    "Shipped → Delivered",
                    trust.data.sla.shippedToDelivered,
                    "Median hours from shipped to delivered for orders that completed this step in the period.",
                  ],
                ] as const
              ).map(([label, s, info]) => (
                <MetricTile
                  key={label}
                  label={label}
                  value={s.medianHours !== null ? `${s.medianHours}h` : "—"}
                  info={info}
                  hint={
                    <p className="text-xs text-slate-500 mt-1">
                      median · avg {s.avgHours ?? "—"}h · n={s.sampleSize}
                    </p>
                  }
                />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Cancel rate"
                value={`${trust.data.cancels.ratePct}%`}
                color="rose"
                icon={iconBox}
                info="Share of orders cancelled in the selected period."
              />
              <StatsCard
                title="Cancel ₹"
                value={formatCurrency(trust.data.cancels.revenue)}
                color="rose"
                icon={iconBox}
                info="Estimated revenue lost from cancelled orders in the selected period."
              />
              <StatsCard
                title="Refund rate"
                value={`${trust.data.refunds.ratePct}%`}
                color="amber"
                icon={iconBox}
                info="Share of paid orders that were refunded in the selected period."
              />
              <StatsCard
                title="Avg rating"
                value={trust.data.reviews.avgRating ?? "—"}
                color="emerald"
                icon={iconBox}
                info="Average product review rating across reviews submitted in the selected period."
                trend={{
                  value: `${trust.data.reviews.count} reviews · ${trust.data.reviews.coverage.coveragePct}% coverage`,
                  positive: true,
                }}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsTable
                title="Stuck orders (>3 days)"
                info="Orders that have stayed in the same non-terminal status for more than 3 days and may need ops attention."
                rows={trust.data.stuckOrders}
                rowKey={(r) => r._id}
                columns={[
                  {
                    key: "order",
                    header: "Order",
                    render: (r) => <OrderLink id={r._id} label={r.orderNumber} />,
                  },
                  { key: "user", header: "Customer", render: (r) => r.user.name },
                  { key: "status", header: "Status", render: (r) => r.status },
                  { key: "age", header: "Age", align: "right", render: (r) => `${r.ageDays}d` },
                  {
                    key: "total",
                    header: "Total",
                    align: "right",
                    render: (r) => formatCurrency(r.grandTotal),
                  },
                ]}
              />
              <SimpleBarList
                title="Cancel reasons"
                info="Most common cancellation reasons reported in the selected period."
                data={trust.data.cancels.reasons}
                nameKey="reason"
                valueKey="count"
              />
              <AnalyticsTable
                title="Coupon performance"
                info="Coupon usage, discount given, and GMV attributed to each code in the selected period."
                rows={trust.data.coupons}
                rowKey={(r) => r.code}
                columns={[
                  { key: "code", header: "Code", render: (r) => r.code },
                  { key: "uses", header: "Uses", align: "right", render: (r) => r.uses },
                  {
                    key: "discount",
                    header: "Discount",
                    align: "right",
                    render: (r) => formatCurrency(r.discountGiven),
                  },
                  {
                    key: "gmv",
                    header: "GMV",
                    align: "right",
                    render: (r) => formatCurrency(r.gmv),
                  },
                  {
                    key: "util",
                    header: "Used / Limit",
                    align: "right",
                    render: (r) =>
                      `${r.usedCount ?? "—"} / ${r.usageLimit ?? "—"}`,
                  },
                ]}
              />
              <SimpleBarList
                title="Payment methods"
                info="How customers paid for orders in the selected period."
                data={trust.data.paymentMethods}
                nameKey="method"
                valueKey="count"
              />
              <AnalyticsTable
                title="Revenue by state"
                info="Paid order revenue and volume grouped by shipping state."
                rows={trust.data.geo.byState}
                rowKey={(r) => r.state}
                columns={[
                  { key: "state", header: "State", render: (r) => r.state },
                  { key: "orders", header: "Orders", align: "right", render: (r) => r.orders },
                  {
                    key: "revenue",
                    header: "Revenue",
                    align: "right",
                    render: (r) => formatCurrency(r.revenue),
                  },
                ]}
              />
              <AnalyticsTable
                title="Low-rated products (≤2★, ≥3 reviews)"
                info="Products with average rating of 2 stars or below and at least 3 reviews — quality risk flags."
                rows={trust.data.reviews.lowRatedProducts}
                rowKey={(r) => r.productId}
                columns={[
                  {
                    key: "title",
                    header: "Product",
                    render: (r) => <ProductLink id={r.productId} label={r.title} />,
                  },
                  { key: "rating", header: "Avg", align: "right", render: (r) => r.avgRating },
                  { key: "count", header: "Reviews", align: "right", render: (r) => r.count },
                ]}
              />
            </div>
          </div>
        )}
      </AnalyticsSection>

      {/* Tier E — Customers */}
      <AnalyticsSection
        title="Customers & callbacks"
        description="LTV, retention, win-backs, and lead pipeline"
        loading={customers.loading}
        error={customers.error}
      >
        {customers.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="New customer revenue"
                value={formatCurrency(customers.data.newVsReturning.newCustomers.revenue)}
                color="emerald"
                icon={iconBox}
                info="Revenue from customers whose first paid order falls in the selected period."
                trend={{
                  value: `${customers.data.newVsReturning.newCustomers.orders} orders`,
                  positive: true,
                }}
              />
              <StatsCard
                title="Returning revenue"
                value={formatCurrency(customers.data.newVsReturning.returningCustomers.revenue)}
                color="indigo"
                icon={iconBox}
                info="Revenue from customers who had at least one prior paid order before this period."
                trend={{
                  value: `${customers.data.newVsReturning.returningCustomers.orders} orders`,
                  positive: true,
                }}
              />
              <StatsCard
                title="Signup → purchase"
                value={`${customers.data.signupToPurchase.conversionPct}%`}
                color="amber"
                icon={iconBox}
                info="Percentage of signed-up customers who placed at least one paid order."
                trend={{
                  value: `${customers.data.signupToPurchase.buyers}/${customers.data.signupToPurchase.customers} buyers`,
                  positive: true,
                }}
              />
              <StatsCard
                title="Median days to 1st order"
                value={
                  customers.data.signupToPurchase.medianDaysToFirstPurchase ?? "—"
                }
                color="rose"
                icon={iconBox}
                info="Median number of days between signup and a customer’s first paid order."
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleBarList
                title="LTV bands"
                info="How customers are distributed across lifetime-value spend bands."
                data={customers.data.ltvBands}
                nameKey="band"
                valueKey="count"
              />
              <SimpleBarList
                title="Signup channels"
                info="Where registered customers came from (attribution / signup channel)."
                data={customers.data.signupChannels}
                nameKey="channel"
                valueKey="count"
              />
              <AnalyticsTable
                title="VIP customers"
                info="Highest lifetime-value customers ranked by total paid spend."
                rows={customers.data.vipList}
                rowKey={(r) => r.userId}
                columns={[
                  {
                    key: "name",
                    header: "Customer",
                    render: (r) => (
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                      </div>
                    ),
                  },
                  { key: "orders", header: "Orders", align: "right", render: (r) => r.orderCount },
                  {
                    key: "ltv",
                    header: "LTV",
                    align: "right",
                    render: (r) => formatCurrency(r.ltv),
                  },
                ]}
              />
              <AnalyticsTable
                title="One-and-done (60d+)"
                info="Customers with exactly one paid order whose last purchase was 60+ days ago — win-back candidates."
                rows={customers.data.oneAndDone}
                rowKey={(r) => r.userId}
                columns={[
                  {
                    key: "name",
                    header: "Customer",
                    render: (r) => (
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: "ltv",
                    header: "LTV",
                    align: "right",
                    render: (r) => formatCurrency(r.ltv),
                  },
                  {
                    key: "last",
                    header: "Last order",
                    align: "right",
                    render: (r) =>
                      new Date(r.lastOrderAt).toLocaleDateString("en-IN"),
                  },
                ]}
              />
              <AnalyticsTable
                title="Registered, never ordered"
                info="Signed-up customers who have never placed a paid order."
                rows={customers.data.neverOrdered}
                rowKey={(r) => r.userId}
                columns={[
                  {
                    key: "name",
                    header: "Customer",
                    render: (r) => (
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: "created",
                    header: "Signed up",
                    align: "right",
                    render: (r) =>
                      new Date(r.createdAt).toLocaleDateString("en-IN"),
                  },
                ]}
              />
              <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    Cohort retention (% with a paid order)
                    <InfoTooltip text="Monthly signup cohorts and the share that placed a paid order in month 0, 1, and 2 after signup." />
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-4 py-2.5 text-left font-medium text-slate-500">Cohort</th>
                        <th className="px-4 py-2.5 text-right font-medium text-slate-500">Size</th>
                        <th className="px-4 py-2.5 text-right font-medium text-slate-500">M0</th>
                        <th className="px-4 py-2.5 text-right font-medium text-slate-500">M1</th>
                        <th className="px-4 py-2.5 text-right font-medium text-slate-500">M2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.data.cohorts.map((c) => (
                        <tr key={c.cohort} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2.5">{c.cohort}</td>
                          <td className="px-4 py-2.5 text-right">{c.size}</td>
                          <td className="px-4 py-2.5 text-right">{c.m0 ?? "—"}{c.m0 !== null ? "%" : ""}</td>
                          <td className="px-4 py-2.5 text-right">{c.m1 ?? "—"}{c.m1 !== null ? "%" : ""}</td>
                          <td className="px-4 py-2.5 text-right">{c.m2 ?? "—"}{c.m2 !== null ? "%" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricTile
                label="Callbacks — new"
                value={customers.data.callbacks.byStatus.new || 0}
                info="Customisation / callback requests still marked as new."
              />
              <MetricTile
                label="Contacted"
                value={customers.data.callbacks.byStatus.contacted || 0}
                info="Callback requests that have been contacted but are not yet closed."
              />
              <MetricTile
                label="Median contact latency"
                value={
                  customers.data.callbacks.contactLatency.medianHours !== null
                    ? `${customers.data.callbacks.contactLatency.medianHours}h`
                    : "—"
                }
                info="Median hours from request creation to first contact."
              />
            </div>
            <AnalyticsTable
              title="Open callback requests"
              info="Open customisation leads awaiting follow-up, sorted by age."
              rows={customers.data.callbacks.openRequests}
              rowKey={(r) => r._id}
              columns={[
                {
                  key: "req",
                  header: "Requirement",
                  render: (r) => (
                    <Link
                      href="/admin/callback-requests"
                      className="hover:underline"
                    >
                      {r.requirement}
                    </Link>
                  ),
                },
                { key: "phone", header: "Phone", render: (r) => r.phone },
                {
                  key: "age",
                  header: "Age",
                  align: "right",
                  render: (r) => `${Math.round(r.ageHours)}h`,
                },
              ]}
            />
          </div>
        )}
      </AnalyticsSection>
    </div>
  );
}
