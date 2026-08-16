"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PeriodSelection,
  buildPeriodQuery,
} from "@/lib/analytics/periods";
import { MetricWithDelta } from "@/lib/analytics/format";
import StatsCard from "@/app/admin/components/StatsCard";
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
            <StatsCard title="Revenue" value={formatCurrency(m.revenue.value)} color="emerald" icon={iconBox} trend={trendFromDelta(m.revenue.deltaPct)} />
            <StatsCard title="Orders" value={m.orders.value.toLocaleString()} color="indigo" icon={iconBox} trend={trendFromDelta(m.orders.deltaPct)} />
            <StatsCard title="AOV" value={formatCurrency(m.aov.value)} color="amber" icon={iconBox} trend={trendFromDelta(m.aov.deltaPct)} />
            <StatsCard title="Payment success" value={`${m.paymentSuccessPct.value.toFixed(1)}%`} color="rose" icon={iconBox} trend={trendFromDelta(m.paymentSuccessPct.deltaPct)} />
            <StatsCard title="Net after discount" value={formatCurrency(m.netAfterDiscount.value)} color="emerald" icon={iconBox} trend={trendFromDelta(m.netAfterDiscount.deltaPct)} />
            <StatsCard title="Pending payment" value={formatCurrency(m.pendingRevenue.value)} color="amber" icon={iconBox} trend={{ value: `${m.pendingRevenue.count} orders`, positive: true }} />
            <StatsCard title="Abandoned carts" value={formatCurrency(m.abandonedCart.value)} color="rose" icon={iconBox} trend={{ value: `${m.abandonedCart.count} carts`, positive: false }} />
            <StatsCard title="Low-stock SKUs" value={m.lowStockCount} color="amber" icon={iconBox} />
            <StatsCard title="Cancel rate" value={`${m.cancelRatePct.value.toFixed(1)}%`} color="rose" icon={iconBox} trend={trendFromDelta(m.cancelRatePct.deltaPct)} />
            <StatsCard title="Refund rate" value={`${m.refundRatePct.value.toFixed(1)}%`} color="rose" icon={iconBox} trend={trendFromDelta(m.refundRatePct.deltaPct)} />
            <StatsCard title="Open callbacks" value={m.openCallbacks} color="indigo" icon={iconBox} />
            <StatsCard title="Active products" value={`${m.products.active} / ${m.products.total}`} color="indigo" icon={iconBox} />
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
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Wishlisted products</p>
                <p className="text-xl font-bold text-slate-900">{merch.data.wishlistOverlap.wishlistedProducts}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Purchased products</p>
                <p className="text-xl font-bold text-slate-900">{merch.data.wishlistOverlap.purchasedProducts}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Wishlist ∩ purchased</p>
                <p className="text-xl font-bold text-slate-900">{merch.data.wishlistOverlap.overlapProducts}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsTable
                title="Top products by revenue"
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
                  ["Paid → Processing", trust.data.sla.paidToProcessing],
                  ["Processing → Shipped", trust.data.sla.processingToShipped],
                  ["Shipped → Delivered", trust.data.sla.shippedToDelivered],
                ] as const
              ).map(([label, s]) => (
                <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-slate-900">
                    {s.medianHours !== null ? `${s.medianHours}h` : "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    median · avg {s.avgHours ?? "—"}h · n={s.sampleSize}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Cancel rate" value={`${trust.data.cancels.ratePct}%`} color="rose" icon={iconBox} />
              <StatsCard title="Cancel ₹" value={formatCurrency(trust.data.cancels.revenue)} color="rose" icon={iconBox} />
              <StatsCard title="Refund rate" value={`${trust.data.refunds.ratePct}%`} color="amber" icon={iconBox} />
              <StatsCard
                title="Avg rating"
                value={trust.data.reviews.avgRating ?? "—"}
                color="emerald"
                icon={iconBox}
                trend={{
                  value: `${trust.data.reviews.count} reviews · ${trust.data.reviews.coverage.coveragePct}% coverage`,
                  positive: true,
                }}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsTable
                title="Stuck orders (>3 days)"
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
                data={trust.data.cancels.reasons}
                nameKey="reason"
                valueKey="count"
              />
              <AnalyticsTable
                title="Coupon performance"
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
                data={trust.data.paymentMethods}
                nameKey="method"
                valueKey="count"
              />
              <AnalyticsTable
                title="Revenue by state"
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
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleBarList
                title="LTV bands"
                data={customers.data.ltvBands}
                nameKey="band"
                valueKey="count"
              />
              <SimpleBarList
                title="Signup channels"
                data={customers.data.signupChannels}
                nameKey="channel"
                valueKey="count"
              />
              <AnalyticsTable
                title="VIP customers"
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
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Cohort retention (% with a paid order)
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
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Callbacks — new</p>
                <p className="text-xl font-bold text-slate-900">
                  {customers.data.callbacks.byStatus.new || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Contacted</p>
                <p className="text-xl font-bold text-slate-900">
                  {customers.data.callbacks.byStatus.contacted || 0}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Median contact latency</p>
                <p className="text-xl font-bold text-slate-900">
                  {customers.data.callbacks.contactLatency.medianHours !== null
                    ? `${customers.data.callbacks.contactLatency.medianHours}h`
                    : "—"}
                </p>
              </div>
            </div>
            <AnalyticsTable
              title="Open callback requests"
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
