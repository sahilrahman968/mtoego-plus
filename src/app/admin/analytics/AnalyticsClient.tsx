"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PeriodSelection,
  buildPeriodQuery,
} from "@/lib/analytics/periods";
import { MetricWithDelta } from "@/lib/analytics/format";
import StatsCard, { KpiGrid, KpiHint } from "@/app/admin/components/StatsCard";
import InfoTooltip from "@/app/admin/components/InfoTooltip";
import PeriodToggle from "./components/PeriodToggle";
import AnalyticsSection from "./components/AnalyticsSection";
import AnalyticsNav, { AnalyticsNavItem } from "./components/AnalyticsNav";
import { GridSkeleton, KpiSkeleton } from "./components/Skeletons";
import AnalyticsTable, {
  ProductLink,
  CategoryLabel,
  OrderLink,
} from "./components/AnalyticsTable";
import {
  DailyRevenueChart,
  OrdersAovChart,
  GrossVsDiscountChart,
  FunnelChart,
  AbandonmentAgeChart,
  PaymentSuccessChart,
  MonthlyRevenueChart,
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

  return { data, loading, error, retry: load };
}

interface PulseData {
  metrics: {
    totalRevenue: MetricWithDelta;
    netRevenue: MetricWithDelta;
    revenue: MetricWithDelta;
    orders: MetricWithDelta;
    aov: MetricWithDelta;
    paymentSuccessPct: MetricWithDelta;
    discount: MetricWithDelta;
    netAfterDiscount: MetricWithDelta;
    pendingRevenue: { value: number; count: number };
    cancelRatePct: MetricWithDelta;
    refundRatePct: MetricWithDelta;
    cancelled: { count: number; revenue: number; paidRevenue: number };
    refunded: { count: number; revenue: number };
    abandonedCart: { count: number; value: number };
    lowStockCount: number;
    openCallbacks: number;
    products: { active: number; inactive: number; total: number };
  };
}

interface CurvesData {
  granularity: "day" | "week";
  daily: {
    label: string;
    revenue: number;
    orders: number;
    aov: number;
    discount: number;
    subtotal: number;
  }[];
  monthlyRevenue: {
    month: string;
    year: number;
    revenue: number;
    orders: number;
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
  topProducts: {
    productId: string;
    title: string;
    imageUrl: string | null;
    revenue: number;
    units: number;
  }[];
  topCategories: {
    categoryId: string | null;
    name: string;
    imageUrl: string | null;
    revenue: number;
    units: number;
  }[];
  highWishlistLowSales: {
    productId: string;
    title: string;
    imageUrl: string | null;
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
    imageUrl: string | null;
    quantity: number;
    value: number;
    cartCount: number;
  }[];
  lowStockBestsellers: {
    productId: string;
    title: string;
    imageUrl: string | null;
    sku: string;
    unitsSold: number;
    stock: number;
  }[];
  deadStock: {
    productId: string;
    title: string;
    imageUrl: string | null;
    stock: number;
  }[];
  priceDriftCarts: {
    productId: string;
    title: string;
    imageUrl: string | null;
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
  salesChannels: { channel: string; revenue: number; orders: number }[];
  geo: {
    byState: { state: string; revenue: number; orders: number }[];
    byCity: { city: string; state: string; revenue: number; orders: number }[];
  };
  reviews: {
    avgRating: number | null;
    count: number;
    distribution: Record<string, number>;
    coverage: { totalProducts: number; reviewedProducts: number; coveragePct: number };
    lowRatedProducts: {
      productId: string;
      title: string;
      imageUrl: string | null;
      avgRating: number;
      count: number;
    }[];
  };
}

interface CustomersData {
  health: {
    newCustomers: { count: number; orders: number; revenue: number };
    returningCustomers: { count: number; orders: number; revenue: number };
    repeatPurchaseRatePct: number;
    clv: number;
    avgOrdersPerCustomer: number;
    medianDaysBetweenPurchases: number | null;
    avgDaysBetweenPurchases: number | null;
    purchaseGapSampleSize: number;
    marketingSpendInPeriod: number | null;
    cac: number | null;
    clvCacRatio: number | null;
    cacConfigured: boolean;
    buyers: number;
  };
  newVsReturning: {
    newCustomers: { count: number; orders: number; revenue: number };
    returningCustomers: { count: number; orders: number; revenue: number };
  };
  signupToPurchase: {
    customers: number;
    buyers: number;
    conversionPct: number;
    medianDaysToFirstPurchase: number | null;
  };
  ltvBands: { band: string; count: number }[];
  topDecile: {
    percentile: number;
    count: number;
    buyerCount: number;
    revenue: number;
    revenueSharePct: number;
    customers: {
      userId: string;
      name: string;
      email: string;
      orderCount: number;
      ltv: number;
      lastOrderAt: string | null;
    }[];
  };
  oneAndDone: { userId: string; name: string; email: string; ltv: number; lastOrderAt: string }[];
  neverOrdered: { userId: string; name: string; email: string; createdAt: string }[];
  signupChannels: { channel: string; count: number }[];
  customersByLocation: {
    byState: { state: string; customers: number }[];
    byCity: { city: string; state: string; customers: number }[];
  };
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

const NAV_ITEMS: AnalyticsNavItem[] = [
  { id: "pulse", label: "Sales" },
  { id: "trends", label: "Trends" },
  { id: "merchandising", label: "Merchandising" },
  { id: "operations", label: "Operations" },
  { id: "customers", label: "Customers" },
];

export default function AnalyticsClient() {
  const [selection, setSelection] = useState<PeriodSelection>({ period: "30d" });

  const pulse = useAnalyticsFetch<PulseData>("pulse", selection);
  const curves = useAnalyticsFetch<CurvesData>("curves", selection);
  const merch = useAnalyticsFetch<MerchData>("merchandising", selection);
  const trust = useAnalyticsFetch<TrustData>("trust", selection);
  const customers = useAnalyticsFetch<CustomersData>("customers", selection);

  const m = pulse.data?.metrics;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-admin-heading">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-admin-muted">
            Growth, intent, ops, and customer insights
          </p>
        </div>
        <PeriodToggle value={selection} onChange={setSelection} />
      </div>

      <AnalyticsNav items={NAV_ITEMS} />

      <div className="space-y-8">
        {/* Tier A — Sales & revenue */}
        <AnalyticsSection
          id="pulse"
          title="Sales & revenue"
          description="Total and net revenue, orders, and AOV vs the previous equal period"
          loading={pulse.loading}
          error={pulse.error}
          onRetry={pulse.retry}
          skeleton={<KpiSkeleton count={12} columns={4} />}
        >
          {m && (
            <KpiGrid columns={4}>
              <StatsCard
                title="Total revenue"
                value={formatCurrency(m.totalRevenue?.value ?? m.revenue.value)}
                trend={trendFromDelta(m.totalRevenue?.deltaPct ?? m.revenue.deltaPct)}
                info="Gross GMV from paid checkouts in the period, including orders later refunded or cancelled after payment."
              />
              <StatsCard
                title="Net revenue"
                value={formatCurrency(m.netRevenue?.value ?? m.revenue.value)}
                trend={trendFromDelta(m.netRevenue?.deltaPct ?? m.revenue.deltaPct)}
                info="Total revenue minus refunds and post-payment cancellations in the selected period."
              />
              <StatsCard
                title="Orders"
                value={m.orders.value.toLocaleString()}
                trend={trendFromDelta(m.orders.deltaPct)}
                info="Count of paid orders still in a fulfilled status (excludes refunded and cancelled)."
              />
              <StatsCard
                title="AOV"
                value={formatCurrency(m.aov.value)}
                trend={trendFromDelta(m.aov.deltaPct)}
                info="Average order value — net revenue divided by paid orders in the selected period."
              />
              <StatsCard
                title="Payment success"
                value={`${m.paymentSuccessPct.value.toFixed(1)}%`}
                trend={trendFromDelta(m.paymentSuccessPct.deltaPct)}
                info="Share of checkout attempts that completed payment successfully (paid vs cancelled unpaid)."
              />
              <StatsCard
                title="Net after discount"
                value={formatCurrency(m.netAfterDiscount.value)}
                trend={trendFromDelta(m.netAfterDiscount.deltaPct)}
                info="Merchandise subtotal after discounts on paid orders (before shipping/tax adjustments)."
              />
              <StatsCard
                title="Pending payment"
                value={formatCurrency(m.pendingRevenue.value)}
                trend={{ value: `${m.pendingRevenue.count} orders`, positive: true }}
                info="Value of orders that are still awaiting payment and have not been cancelled."
                href="/admin/orders"
              />
              <StatsCard
                title="Abandoned carts"
                value={formatCurrency(m.abandonedCart.value)}
                trend={{ value: `${m.abandonedCart.count} carts`, positive: false }}
                info="Estimated value of non-empty carts that never converted to a paid order."
              />
              <StatsCard
                title="Low-stock SKUs"
                value={m.lowStockCount}
                info="Number of product variants currently at or below the low-stock threshold."
                href="/admin/products"
              />
              <StatsCard
                title="Cancel rate"
                value={`${m.cancelRatePct.value.toFixed(1)}%`}
                trend={trendFromDelta(m.cancelRatePct.deltaPct)}
                info="Percentage of orders that were cancelled during the selected period."
              />
              <StatsCard
                title="Refund rate"
                value={`${m.refundRatePct.value.toFixed(1)}%`}
                trend={trendFromDelta(m.refundRatePct.deltaPct)}
                info="Percentage of paid orders that were refunded during the selected period."
              />
              <StatsCard
                title="Open callbacks"
                value={m.openCallbacks}
                info="Customisation / callback requests that are still open and need follow-up."
                href="/admin/callback-requests"
              />
            </KpiGrid>
          )}
        </AnalyticsSection>

        {/* Tier B — Trends */}
        <AnalyticsSection
          id="trends"
          title="Trends"
          description="Revenue by day, week, and month — plus funnels"
          loading={curves.loading}
          error={curves.error}
          onRetry={curves.retry}
          skeleton={<GridSkeleton count={2} variant="chart" />}
        >
          {curves.data && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <DailyRevenueChart
                data={curves.data.daily}
                granularity={curves.data.granularity || "day"}
              />
              <OrdersAovChart data={curves.data.daily} />
              <MonthlyRevenueChart data={curves.data.monthlyRevenue || []} />
              <GrossVsDiscountChart data={curves.data.daily} />
              <FunnelChart ordersByStatus={curves.data.ordersByStatus} />
              <AbandonmentAgeChart data={curves.data.abandonmentAge} />
              <PaymentSuccessChart data={curves.data.weeklyPayment} />
            </div>
          )}
        </AnalyticsSection>

        {/* Tier C — Merchandising */}
        <AnalyticsSection
          id="merchandising"
          title="Merchandising"
          description="What to promote, restock, and recover"
          loading={merch.loading}
          error={merch.error}
          onRetry={merch.retry}
          skeleton={<GridSkeleton count={2} />}
        >
          {merch.data && (
            <div className="space-y-4">
              <KpiGrid columns={3}>
                <StatsCard
                  title="Wishlisted products"
                  value={merch.data.wishlistOverlap.wishlistedProducts}
                  info="Distinct products currently present on at least one customer wishlist."
                />
                <StatsCard
                  title="Purchased products"
                  value={merch.data.wishlistOverlap.purchasedProducts}
                  info="Distinct products that appeared on paid orders in the selected period."
                />
                <StatsCard
                  title="Wishlist ∩ purchased"
                  value={merch.data.wishlistOverlap.overlapProducts}
                  info="Products that are both on a wishlist and were purchased in the selected period."
                />
              </KpiGrid>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <AnalyticsTable
                  title="Low-stock bestsellers"
                  info="Top-selling variants that are running low on stock and may need restocking soon."
                  rows={merch.data.lowStockBestsellers}
                  rowKey={(r) => `${r.productId}-${r.sku}`}
                  columns={[
                    {
                      key: "title",
                      header: "Product",
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
                    },
                    { key: "sku", header: "SKU", render: (r) => r.sku },
                    { key: "sold", header: "Sold", align: "right", render: (r) => r.unitsSold },
                    { key: "stock", header: "Stock", align: "right", render: (r) => r.stock },
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
                        <div className="min-w-0">
                          <p className="font-medium text-admin-heading">{r.user.name}</p>
                          <p className="truncate text-xs text-admin-muted">{r.user.email}</p>
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
                  title="Revenue by product"
                  info="Highest-revenue products from paid orders in the selected period."
                  rows={merch.data.topProducts}
                  rowKey={(r) => r.productId}
                  columns={[
                    {
                      key: "title",
                      header: "Product",
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
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
                  title="Revenue by category"
                  info="Categories ranked by revenue from paid orders in the selected period."
                  rows={merch.data.topCategories}
                  rowKey={(r) => r.categoryId || r.name}
                  columns={[
                    {
                      key: "name",
                      header: "Category",
                      render: (r) => (
                        <CategoryLabel label={r.name} imageUrl={r.imageUrl} />
                      ),
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
                  title="High wishlist, low sales"
                  info="Products with strong wishlist interest but few units sold — candidates to promote or discount."
                  rows={merch.data.highWishlistLowSales}
                  rowKey={(r) => r.productId}
                  columns={[
                    {
                      key: "title",
                      header: "Product",
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
                    },
                    { key: "wish", header: "Wishlist", align: "right", render: (r) => r.wishlistCount },
                    { key: "sold", header: "Sold", align: "right", render: (r) => r.unitsSold },
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
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
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
                  title="Dead stock (60d no sales)"
                  info="In-stock products with no paid sales in the last 60 days — review for markdown or delisting."
                  rows={merch.data.deadStock}
                  rowKey={(r) => r.productId!}
                  columns={[
                    {
                      key: "title",
                      header: "Product",
                      render: (r) => (
                        <ProductLink
                          id={r.productId!}
                          label={r.title!}
                          imageUrl={r.imageUrl}
                        />
                      ),
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
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
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

        {/* Tier D — Operations */}
        <AnalyticsSection
          id="operations"
          title="Operations"
          description="Fulfillment, leakage, coupons, reviews, and geo"
          loading={trust.loading}
          error={trust.error}
          onRetry={trust.retry}
          skeleton={<GridSkeleton count={2} />}
        >
          {trust.data && (
            <div className="space-y-4">
              <KpiGrid columns={3}>
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
                  <StatsCard
                    key={label}
                    title={label}
                    value={s.medianHours !== null ? `${s.medianHours}h` : "—"}
                    info={info}
                    hint={
                      <KpiHint>
                        median · avg {s.avgHours ?? "—"}h · n={s.sampleSize}
                      </KpiHint>
                    }
                  />
                ))}
              </KpiGrid>
              <KpiGrid columns={4}>
                <StatsCard
                  title="Cancel rate"
                  value={`${trust.data.cancels.ratePct}%`}
                  info="Share of orders cancelled in the selected period."
                />
                <StatsCard
                  title="Cancel ₹"
                  value={formatCurrency(trust.data.cancels.revenue)}
                  info="Estimated revenue lost from cancelled orders in the selected period."
                />
                <StatsCard
                  title="Refund rate"
                  value={`${trust.data.refunds.ratePct}%`}
                  info="Share of paid orders that were refunded in the selected period."
                />
                <StatsCard
                  title="Avg rating"
                  value={trust.data.reviews.avgRating ?? "—"}
                  info="Average product review rating across reviews submitted in the selected period."
                  trend={{
                    value: `${trust.data.reviews.count} reviews · ${trust.data.reviews.coverage.coveragePct}% coverage`,
                    positive: true,
                  }}
                />
              </KpiGrid>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                  title="Revenue by sales channel"
                  info="Paid order revenue attributed to customer signup channel (acquisition proxy until marketplace / paid-media channels exist)."
                  data={trust.data.salesChannels || []}
                  nameKey="channel"
                  valueKey="revenue"
                  valuePrefix="₹"
                />
                <SimpleBarList
                  title="Revenue by payment method"
                  info="Paid order revenue grouped by checkout payment method."
                  data={trust.data.paymentMethods}
                  nameKey="method"
                  valueKey="revenue"
                  valuePrefix="₹"
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
                  title="Revenue by city"
                  info="Paid order revenue and volume grouped by shipping city."
                  rows={trust.data.geo.byCity}
                  rowKey={(r) => `${r.city}-${r.state}`}
                  columns={[
                    {
                      key: "city",
                      header: "City",
                      render: (r) => (
                        <span>
                          {r.city}
                          <span className="text-admin-muted"> · {r.state}</span>
                        </span>
                      ),
                    },
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
                      render: (r) => (
                        <ProductLink
                          id={r.productId}
                          label={r.title}
                          imageUrl={r.imageUrl}
                        />
                      ),
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
          id="customers"
          title="Customers"
          description="Who buys, how often, what they’re worth — and whether acquisition pays back"
          loading={customers.loading}
          error={customers.error}
          onRetry={customers.retry}
          skeleton={<GridSkeleton count={2} />}
        >
          {customers.data && (
            <div className="space-y-4">
              <KpiGrid columns={4}>
                <StatsCard
                  title="New customers"
                  value={(customers.data.health?.newCustomers.count ?? customers.data.newVsReturning.newCustomers.count ?? 0).toLocaleString()}
                  info="Distinct first-time buyers in the selected period (no prior paid order)."
                  trend={{
                    value: `${formatCurrency(customers.data.health?.newCustomers.revenue ?? customers.data.newVsReturning.newCustomers.revenue)} · ${(customers.data.health?.newCustomers.orders ?? customers.data.newVsReturning.newCustomers.orders)} orders`,
                    positive: true,
                  }}
                />
                <StatsCard
                  title="Returning customers"
                  value={(customers.data.health?.returningCustomers.count ?? customers.data.newVsReturning.returningCustomers.count ?? 0).toLocaleString()}
                  info="Distinct buyers in the period who already had a paid order before it started."
                  trend={{
                    value: `${formatCurrency(customers.data.health?.returningCustomers.revenue ?? customers.data.newVsReturning.returningCustomers.revenue)} · ${(customers.data.health?.returningCustomers.orders ?? customers.data.newVsReturning.returningCustomers.orders)} orders`,
                    positive: true,
                  }}
                />
                <StatsCard
                  title="Repeat purchase rate"
                  value={
                    customers.data.health
                      ? `${customers.data.health.repeatPurchaseRatePct}%`
                      : "—"
                  }
                  info="Share of all-time buyers who have placed 2 or more paid orders."
                  trend={
                    customers.data.health
                      ? {
                          value: `${customers.data.health.buyers.toLocaleString()} buyers`,
                          positive: true,
                        }
                      : undefined
                  }
                />
                <StatsCard
                  title="CLV"
                  value={
                    customers.data.health
                      ? formatCurrency(customers.data.health.clv)
                      : "—"
                  }
                  info="Average customer lifetime value — mean paid revenue per buyer across all time."
                />
                <StatsCard
                  title="Avg orders / customer"
                  value={customers.data.health?.avgOrdersPerCustomer ?? "—"}
                  info="Average number of paid orders per buyer (all time)."
                />
                <StatsCard
                  title="Days between purchases"
                  value={customers.data.health?.medianDaysBetweenPurchases ?? "—"}
                  info="Median days between consecutive paid orders for customers with 2+ purchases."
                  hint={
                    customers.data.health ? (
                      <KpiHint>
                        median · avg{" "}
                        {customers.data.health.avgDaysBetweenPurchases ?? "—"}d · n=
                        {customers.data.health.purchaseGapSampleSize}
                      </KpiHint>
                    ) : undefined
                  }
                />
                <StatsCard
                  title="CAC"
                  value={
                    customers.data.health?.cac != null
                      ? formatCurrency(customers.data.health.cac)
                      : "—"
                  }
                  info={
                    customers.data.health?.cacConfigured
                      ? "Customer acquisition cost — prorated marketing spend ÷ new customers in the period. Set ANALYTICS_MONTHLY_MARKETING_SPEND_INR."
                      : "Set ANALYTICS_MONTHLY_MARKETING_SPEND_INR in env to compute CAC from your monthly ads/marketing spend."
                  }
                  trend={
                    customers.data.health?.marketingSpendInPeriod != null
                      ? {
                          value: `${formatCurrency(customers.data.health.marketingSpendInPeriod)} spend`,
                          positive: true,
                        }
                      : undefined
                  }
                />
                <StatsCard
                  title="CLV : CAC"
                  value={
                    customers.data.health?.clvCacRatio != null
                      ? `${customers.data.health.clvCacRatio}×`
                      : "—"
                  }
                  info="Lifetime value divided by acquisition cost. Roughly 3×+ is healthy; 5×+ is strong. Requires CAC to be configured."
                  trend={
                    customers.data.health?.clvCacRatio != null
                      ? {
                          value:
                            customers.data.health.clvCacRatio >= 3
                              ? "Healthy payback"
                              : "Below 3× — watch CAC",
                          positive: customers.data.health.clvCacRatio >= 3,
                        }
                      : undefined
                  }
                />
              </KpiGrid>

              <KpiGrid columns={2}>
                <StatsCard
                  title="Signup → purchase"
                  value={`${customers.data.signupToPurchase.conversionPct}%`}
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
                  info="Median number of days between signup and a customer’s first paid order."
                />
              </KpiGrid>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SimpleBarList
                  title="CLV bands"
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
                  title={`Top ${customers.data.topDecile?.percentile ?? 10}% by revenue`}
                  info={
                    customers.data.topDecile
                      ? `${customers.data.topDecile.count} of ${customers.data.topDecile.buyerCount} buyers · ${customers.data.topDecile.revenueSharePct}% of lifetime revenue (${formatCurrency(customers.data.topDecile.revenue)})`
                      : "Highest-spending customers by lifetime paid revenue."
                  }
                  rows={customers.data.topDecile?.customers || []}
                  rowKey={(r) => r.userId}
                  columns={[
                    {
                      key: "name",
                      header: "Customer",
                      render: (r) => (
                        <div className="min-w-0">
                          <p className="font-medium text-admin-heading">{r.name}</p>
                          <p className="truncate text-xs text-admin-muted">{r.email}</p>
                        </div>
                      ),
                    },
                    { key: "orders", header: "Orders", align: "right", render: (r) => r.orderCount },
                    {
                      key: "ltv",
                      header: "CLV",
                      align: "right",
                      render: (r) => formatCurrency(r.ltv),
                    },
                  ]}
                />
                <AnalyticsTable
                  title="Customers by state"
                  info="Distinct paying customers by last shipping state."
                  rows={customers.data.customersByLocation?.byState || []}
                  rowKey={(r) => r.state}
                  columns={[
                    { key: "state", header: "State", render: (r) => r.state },
                    {
                      key: "customers",
                      header: "Customers",
                      align: "right",
                      render: (r) => r.customers,
                    },
                  ]}
                />
                <AnalyticsTable
                  title="Customers by city"
                  info="Distinct paying customers by last shipping city."
                  rows={customers.data.customersByLocation?.byCity || []}
                  rowKey={(r) => `${r.city}-${r.state}`}
                  columns={[
                    {
                      key: "city",
                      header: "City",
                      render: (r) => (
                        <span>
                          {r.city}
                          <span className="text-admin-muted"> · {r.state}</span>
                        </span>
                      ),
                    },
                    {
                      key: "customers",
                      header: "Customers",
                      align: "right",
                      render: (r) => r.customers,
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
                        <div className="min-w-0">
                          <p className="font-medium text-admin-heading">{r.name}</p>
                          <p className="truncate text-xs text-admin-muted">{r.email}</p>
                        </div>
                      ),
                    },
                    {
                      key: "ltv",
                      header: "CLV",
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
                        <div className="min-w-0">
                          <p className="font-medium text-admin-heading">{r.name}</p>
                          <p className="truncate text-xs text-admin-muted">{r.email}</p>
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
                <div className="overflow-visible rounded-xl border border-admin-line bg-admin-surface">
                  <div className="overflow-visible border-b border-admin-line px-4 py-2.5">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading">
                      Cohort retention (% with a paid order)
                      <InfoTooltip text="Monthly signup cohorts and the share that placed a paid order in month 0, 1, and 2 after signup." />
                    </h3>
                  </div>
                  <div
                    className="overflow-x-auto"
                    role="region"
                    aria-label="Cohort retention"
                    tabIndex={0}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-admin-line bg-admin-subtle/60">
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Cohort</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">Size</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">M0</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">M1</th>
                          <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-admin-muted">M2</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-admin-line">
                        {customers.data.cohorts.map((c) => (
                          <tr key={c.cohort} className="transition-colors hover:bg-admin-hover">
                            <td className="whitespace-nowrap px-4 py-2 text-admin-body">{c.cohort}</td>
                            <td className="px-4 py-2 text-right text-admin-body tabular-nums">{c.size}</td>
                            <td className="px-4 py-2 text-right text-admin-body tabular-nums">{c.m0 ?? "—"}{c.m0 !== null ? "%" : ""}</td>
                            <td className="px-4 py-2 text-right text-admin-body tabular-nums">{c.m1 ?? "—"}{c.m1 !== null ? "%" : ""}</td>
                            <td className="px-4 py-2 text-right text-admin-body tabular-nums">{c.m2 ?? "—"}{c.m2 !== null ? "%" : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <KpiGrid columns={3}>
                <StatsCard
                  title="Callbacks — new"
                  value={customers.data.callbacks.byStatus.new || 0}
                  info="Customisation / callback requests still marked as new."
                  href="/admin/callback-requests"
                />
                <StatsCard
                  title="Contacted"
                  value={customers.data.callbacks.byStatus.contacted || 0}
                  info="Callback requests that have been contacted but are not yet closed."
                  href="/admin/callback-requests"
                />
                <StatsCard
                  title="Median contact latency"
                  value={
                    customers.data.callbacks.contactLatency.medianHours !== null
                      ? `${customers.data.callbacks.contactLatency.medianHours}h`
                      : "—"
                  }
                  info="Median hours from request creation to first contact."
                  hint={
                    <KpiHint>
                      n={customers.data.callbacks.contactLatency.sampleSize}
                    </KpiHint>
                  }
                />
              </KpiGrid>
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
                        className="font-medium text-admin-heading hover:underline"
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
    </div>
  );
}
