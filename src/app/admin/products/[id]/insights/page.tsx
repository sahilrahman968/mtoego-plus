"use client";

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink, ImageIcon, Star } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { AdminErrorState, AdminSkeleton } from "../../../components/FeedbackState";
import StatsCard, { KpiGrid } from "../../../components/StatsCard";
import { Surface, Section } from "../../../components/Surface";
import { chart, chartTooltipStyle } from "../../../components/chartTheme";

type ViewScope = "combined" | string;

interface SalesTrendPoint {
  label: string;
  date: string;
  units: number;
  revenue: number;
  orders: number;
}

interface CombinedPriceTimelinePoint {
  label: string;
  date: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  hasSale?: boolean;
}

interface VariantPriceTimelinePoint {
  label: string;
  date: string;
  priceInclGst: number;
  priceExGst: number;
  hasSale: boolean;
}

interface PriceHistoryEntry {
  _id: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  price: number;
  gst: number;
  compareAtPrice?: number;
  priceInclGst: number;
  effectiveAt: string;
  source: "initial" | "update" | "sale" | "sale_end";
  changedBy?: string;
  saleTitle?: string;
  saleSlug?: string;
  originalPrice?: number;
  originalPriceInclGst?: number;
}

interface VariantInsight {
  variantId: string;
  variantLabel: string;
  sku: string;
  size?: string;
  color?: string;
  stock: number;
  isActive: boolean;
  pricing: {
    priceExGst: number;
    priceInclGst: number;
    basePriceExGst: number;
    basePriceInclGst: number;
    gst: number;
    onSale: boolean;
    saleTitle?: string;
  };
  counters: {
    orders: number;
    unitsSold: number;
    revenue: number;
    avgOrderValue: number;
    cartUnits: number;
    cartsWithVariant: number;
    wishlistCount: number;
    revenueShare: number;
    unitsShare: number;
  };
  salesTrend: SalesTrendPoint[];
  priceTimeline: VariantPriceTimelinePoint[];
  priceHistory: PriceHistoryEntry[];
}

interface AnalyticsPayload {
  product: {
    _id: string;
    title: string;
    slug: string;
    description: string;
    category?: { _id: string; name: string; slug: string };
    images: { url: string; alt?: string }[];
    variants: {
      _id: string;
      size?: string;
      color?: string;
      sku: string;
      price: number;
      gst?: number;
      compareAtPrice?: number;
      stock: number;
      isActive: boolean;
    }[];
    isActive: boolean;
    isFeatured: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  };
  inventory: {
    totalStock: number;
    variantCount: number;
    activeVariantCount: number;
    currentMinPrice: number;
    currentMaxPrice: number;
    onSale?: boolean;
  };
  activeSales?: {
    _id: string;
    title: string;
    slug: string;
    startsAt: string;
    endsAt: string;
    status: string;
    discountType?: "percentage" | "amount";
    discountValue?: number;
  }[];
  counters: {
    orders: number;
    unitsSold: number;
    revenue: number;
    avgOrderValue: number;
    reviewCount: number;
    avgRating: number;
    wishlistCount: number;
    cartsWithProduct: number;
    cartUnits: number;
  };
  variantPerformance: {
    variantId: string;
    variantLabel: string;
    sku: string;
    units: number;
    revenue: number;
    orders: number;
  }[];
  variantInsights: VariantInsight[];
  salesTrend: SalesTrendPoint[];
  priceTimeline: CombinedPriceTimelinePoint[];
  priceHistory: PriceHistoryEntry[];
  recentOrders: {
    _id: string;
    orderNumber: string;
    status: string;
    pricing: { grandTotal: number };
    createdAt: string;
    productLines: {
      variantId: string | null;
      variantLabel: string;
      title: string;
      quantity: number;
      total: number;
    }[];
  }[];
}

const axisTick = { fill: chart.axis, fontSize: 11 };
const chartMargin = { top: 4, right: 4, left: -8, bottom: 0 };

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatFullCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatPriceRange(min: number, max: number): string {
  if (min === max) return formatFullCurrency(min);
  return `${formatFullCurrency(min)} – ${formatFullCurrency(max)}`;
}

function VariantScopeSwitcher({
  scope,
  onChange,
  variants,
}: {
  scope: ViewScope;
  onChange: (scope: ViewScope) => void;
  variants: VariantInsight[];
}) {
  return (
    <div
      role="tablist"
      aria-label="Insight scope"
      className="mb-6 flex flex-wrap gap-2"
    >
      <ScopeTab
        active={scope === "combined"}
        onClick={() => onChange("combined")}
        label="All variants"
        description="Combined product metrics"
      />
      {variants.map((variant) => (
        <ScopeTab
          key={variant.variantId}
          active={scope === variant.variantId}
          onClick={() => onChange(variant.variantId)}
          label={variant.variantLabel}
          description={`${variant.sku}${variant.isActive ? "" : " · inactive"}`}
        />
      ))}
    </div>
  );
}

function ScopeTab({
  active,
  onClick,
  label,
  description,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus ${
        active
          ? "border-admin-body bg-admin-subtle text-admin-heading"
          : "border-admin-line bg-admin-surface text-admin-muted hover:border-admin-faint hover:bg-admin-hover hover:text-admin-heading"
      }`}
    >
      <span className="block text-sm font-medium">{label}</span>
      <span className="block text-xs text-admin-faint">{description}</span>
    </button>
  );
}

export default function ProductInsightsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<ViewScope>("combined");

  const fetchInsights = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${params.id}/analytics`);
      const json = await response.json();
      if (json.success) setData(json.data);
      else setError(json.message || "Could not load product insights.");
    } catch {
      setError("Could not load product insights.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const activeVariant = useMemo(() => {
    if (!data || scope === "combined") return null;
    return data.variantInsights.find((variant) => variant.variantId === scope) ?? null;
  }, [data, scope]);

  const view = useMemo(() => {
    if (!data) return null;

    if (scope === "combined" || !activeVariant) {
      const totalTrendRevenue = data.salesTrend.reduce((sum, row) => sum + row.revenue, 0);
      const totalTrendUnits = data.salesTrend.reduce((sum, row) => sum + row.units, 0);

      return {
        mode: "combined" as const,
        titleSuffix: "All variants combined",
        stockLabel: `${data.inventory.totalStock.toLocaleString("en-IN")} in stock`,
        priceLabel: `${formatPriceRange(data.inventory.currentMinPrice, data.inventory.currentMaxPrice)} incl. GST${
          data.inventory.onSale ? " (sale)" : ""
        }`,
        counters: data.counters,
        salesTrend: data.salesTrend,
        combinedPriceTimeline: data.priceTimeline,
        variantPriceTimeline: null,
        priceHistory: data.priceHistory,
        recentOrders: data.recentOrders,
        totalTrendRevenue,
        totalTrendUnits,
        showVariantPerformance: true,
        showShareCards: false,
      };
    }

    const totalTrendRevenue = activeVariant.salesTrend.reduce(
      (sum, row) => sum + row.revenue,
      0
    );
    const totalTrendUnits = activeVariant.salesTrend.reduce(
      (sum, row) => sum + row.units,
      0
    );

    const recentOrders = data.recentOrders
      .map((order) => {
        const lines = order.productLines.filter(
          (line) => line.variantId === activeVariant.variantId
        );
        if (lines.length === 0) return null;
        const lineTotal = lines.reduce((sum, line) => sum + line.total, 0);
        const lineUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
        return {
          ...order,
          lineTotal,
          lineUnits,
          lineLabel: lines.map((line) => line.variantLabel).join(", "),
        };
      })
      .filter(Boolean) as Array<
      AnalyticsPayload["recentOrders"][number] & {
        lineTotal: number;
        lineUnits: number;
        lineLabel: string;
      }
    >;

    return {
      mode: "variant" as const,
      titleSuffix: activeVariant.variantLabel,
      stockLabel: `${activeVariant.stock.toLocaleString("en-IN")} in stock`,
      priceLabel: activeVariant.pricing.onSale
        ? `${formatFullCurrency(activeVariant.pricing.priceInclGst)} incl. GST (sale · was ${formatFullCurrency(activeVariant.pricing.basePriceInclGst)})`
        : `${formatFullCurrency(activeVariant.pricing.priceInclGst)} incl. GST`,
      counters: {
        orders: activeVariant.counters.orders,
        unitsSold: activeVariant.counters.unitsSold,
        revenue: activeVariant.counters.revenue,
        avgOrderValue: activeVariant.counters.avgOrderValue,
        reviewCount: data.counters.reviewCount,
        avgRating: data.counters.avgRating,
        wishlistCount: activeVariant.counters.wishlistCount,
        cartsWithProduct: activeVariant.counters.cartsWithVariant,
        cartUnits: activeVariant.counters.cartUnits,
      },
      salesTrend: activeVariant.salesTrend,
      combinedPriceTimeline: null,
      variantPriceTimeline: activeVariant.priceTimeline,
      priceHistory: activeVariant.priceHistory,
      recentOrders,
      totalTrendRevenue,
      totalTrendUnits,
      revenueShare: activeVariant.counters.revenueShare,
      unitsShare: activeVariant.counters.unitsShare,
      showVariantPerformance: false,
      showShareCards: true,
      variant: activeVariant,
    };
  }, [activeVariant, data, scope]);

  if (loading) return <AdminSkeleton />;
  if (error || !data || !view) {
    return (
      <AdminErrorState
        title="Unable to load product insights"
        message={error || "The product analytics are unavailable."}
        onRetry={fetchInsights}
      />
    );
  }

  const { product, inventory } = data;

  return (
    <div>
      <PageHeader
        title={product.title}
        description={`Insights for ${view.titleSuffix} · /products/${product.slug}`}
        action={{ label: "Edit product", href: `/admin/products/${product._id}` }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-admin-muted">
        <StatusBadge status={product.isActive ? "active" : "inactive"} />
        {view.mode === "variant" && view.variant && !view.variant.isActive && (
          <StatusBadge status="inactive" />
        )}
        {product.isFeatured && (
          <span className="inline-flex items-center rounded-full bg-admin-info-soft px-2 py-0.5 text-xs font-medium text-admin-info ring-1 ring-inset ring-admin-info-line">
            Featured
          </span>
        )}
        <span>{product.category?.name || "Uncategorised"}</span>
        {view.mode === "combined" && <span>{inventory.variantCount} variants</span>}
        {view.mode === "variant" && view.variant && (
          <span className="font-mono text-xs">{view.variant.sku}</span>
        )}
        <span>{view.stockLabel}</span>
        <span>{view.priceLabel}</span>
        {data.activeSales && data.activeSales.length > 0 && (
          <Link
            href={`/admin/sales/${data.activeSales[0]._id}/performance`}
            className="inline-flex items-center rounded-full bg-admin-warning-soft px-2 py-0.5 text-xs font-medium text-admin-warning ring-1 ring-inset ring-admin-warning-line hover:bg-admin-warning-soft/80"
          >
            On sale: {data.activeSales[0].title}
          </Link>
        )}
        <Link
          href={`/products/${product.slug}`}
          className="inline-flex items-center gap-1 font-medium text-admin-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
          target="_blank"
          rel="noreferrer"
        >
          View storefront
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </div>

      <VariantScopeSwitcher
        scope={scope}
        onChange={setScope}
        variants={data.variantInsights}
      />

      <div className="mb-6 flex flex-wrap items-start gap-4">
        {product.images[0] ? (
          <img
            src={product.images[0].url}
            alt={product.images[0].alt || product.title}
            className="size-20 shrink-0 rounded-xl bg-admin-subtle object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-admin-subtle text-admin-faint">
            <ImageIcon aria-hidden="true" className="size-8" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-admin-muted line-clamp-3">{product.description}</p>
          {product.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-admin-subtle px-2 py-0.5 text-xs text-admin-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <KpiGrid columns={4} className="mb-2.5">
        <StatsCard
          title="Revenue"
          value={formatFullCurrency(view.counters.revenue)}
          info={
            view.mode === "combined"
              ? "Total paid order revenue for this product (ex-GST line totals)."
              : "Paid order revenue for this variant only."
          }
        />
        <StatsCard
          title="Units sold"
          value={view.counters.unitsSold.toLocaleString("en-IN")}
        />
        <StatsCard title="Orders" value={view.counters.orders.toLocaleString("en-IN")} />
        <StatsCard
          title="Avg order value"
          value={formatFullCurrency(view.counters.avgOrderValue)}
          info={
            view.mode === "variant"
              ? "Average line revenue per order containing this variant."
              : undefined
          }
        />
      </KpiGrid>
      <KpiGrid columns={4} className="mb-6">
        <StatsCard
          title="Reviews"
          value={
            view.counters.reviewCount > 0
              ? `${view.counters.avgRating} / 5`
              : "No reviews"
          }
          icon={<Star aria-hidden="true" className="size-4" />}
          hint={
            <p className="mt-0.5 text-xs text-admin-muted">
              {view.mode === "variant"
                ? "Product-level reviews"
                : view.counters.reviewCount > 0
                  ? `${view.counters.reviewCount} review${view.counters.reviewCount === 1 ? "" : "s"}`
                  : "No reviews yet"}
            </p>
          }
          href={view.counters.reviewCount > 0 ? "/admin/reviews" : undefined}
          actionLabel="Manage reviews"
        />
        <StatsCard
          title={view.mode === "combined" ? "Wishlists" : "Wishlist saves"}
          value={view.counters.wishlistCount.toLocaleString("en-IN")}
          info={
            view.mode === "combined"
              ? "Customers who saved this product to their wishlist."
              : "Wishlist saves for this specific variant."
          }
        />
        <StatsCard
          title={view.mode === "combined" ? "Active carts" : "In carts"}
          value={view.counters.cartsWithProduct.toLocaleString("en-IN")}
          hint={
            <p className="mt-0.5 text-xs text-admin-muted">
              {view.counters.cartUnits} unit{view.counters.cartUnits === 1 ? "" : "s"} held
            </p>
          }
        />
        {view.showShareCards ? (
          <>
            <StatsCard
              title="Revenue share"
              value={`${view.revenueShare}%`}
              hint={
                <p className="mt-0.5 text-xs text-admin-muted">
                  Of all paid revenue for this product
                </p>
              }
            />
          </>
        ) : (
          <StatsCard
            title="Last 30 days"
            value={formatFullCurrency(view.totalTrendRevenue)}
            hint={
              <p className="mt-0.5 text-xs text-admin-muted">
                {view.totalTrendUnits.toLocaleString("en-IN")} units sold
              </p>
            }
          />
        )}
      </KpiGrid>

      {view.showShareCards && (
        <KpiGrid columns={4} className="mb-6">
          <StatsCard
            title="Units share"
            value={`${view.unitsShare}%`}
            hint={
              <p className="mt-0.5 text-xs text-admin-muted">
                Of all units sold for this product
              </p>
            }
          />
          <StatsCard
            title="Last 30 days"
            value={formatFullCurrency(view.totalTrendRevenue)}
            hint={
              <p className="mt-0.5 text-xs text-admin-muted">
                {view.totalTrendUnits.toLocaleString("en-IN")} units sold
              </p>
            }
          />
        </KpiGrid>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <SalesTrendChart data={view.salesTrend} mode={view.mode} />
        {view.mode === "combined" && view.combinedPriceTimeline ? (
          <CombinedPriceTimelineChart data={view.combinedPriceTimeline} />
        ) : (
          <VariantPriceTimelineChart
            data={view.variantPriceTimeline ?? []}
            variantLabel={view.variant?.variantLabel ?? "Variant"}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {view.showVariantPerformance ? (
          <Surface className="min-w-0">
            <h3 className="mb-4 text-sm font-semibold text-admin-heading">
              Variant breakdown
            </h3>
            {data.variantPerformance.length === 0 ? (
              <p className="text-sm text-admin-faint">No paid orders for this product yet.</p>
            ) : (
              <div
                className="overflow-x-auto"
                role="region"
                aria-label="Variant breakdown"
                tabIndex={0}
              >
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="text-left text-admin-muted">
                      <th className="pb-2 font-medium">Variant</th>
                      <th className="pb-2 font-medium">Units</th>
                      <th className="pb-2 font-medium">Orders</th>
                      <th className="pb-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variantPerformance.map((row) => (
                      <tr key={row.variantId} className="border-t border-admin-line">
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setScope(row.variantId)}
                            className="text-left hover:text-admin-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
                          >
                            <p className="font-medium text-admin-heading">{row.variantLabel}</p>
                            <p className="text-xs text-admin-faint">{row.sku}</p>
                          </button>
                        </td>
                        <td className="py-2 tabular-nums">{row.units}</td>
                        <td className="py-2 tabular-nums">{row.orders}</td>
                        <td className="py-2 tabular-nums">
                          {formatFullCurrency(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Surface>
        ) : (
          <Surface>
            <h3 className="mb-4 text-sm font-semibold text-admin-heading">Variant snapshot</h3>
            {view.variant ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-admin-muted">SKU</dt>
                  <dd className="font-medium text-admin-heading">{view.variant.sku}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Stock</dt>
                  <dd className="font-medium text-admin-heading">{view.variant.stock}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Price (incl. GST)</dt>
                  <dd className="font-medium text-admin-heading">
                    {formatFullCurrency(view.variant.pricing.priceInclGst)}
                  </dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Revenue share</dt>
                  <dd className="font-medium text-admin-heading">{view.revenueShare}%</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Units share</dt>
                  <dd className="font-medium text-admin-heading">{view.unitsShare}%</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Status</dt>
                  <dd className="font-medium text-admin-heading">
                    {view.variant.isActive ? "Active" : "Inactive"}
                  </dd>
                </div>
              </dl>
            ) : null}
          </Surface>
        )}

        <Surface>
          <h3 className="mb-4 text-sm font-semibold text-admin-heading">
            {view.mode === "combined" ? "Recent orders" : "Recent orders with this variant"}
          </h3>
          {view.recentOrders.length === 0 ? (
            <p className="text-sm text-admin-faint">
              {view.mode === "combined" ? "No paid orders yet." : "No paid orders for this variant yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {view.recentOrders.map((order) => (
                <li key={order._id}>
                  <Link
                    href={`/admin/orders/${order._id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {order.orderNumber}
                      </span>
                      {"lineLabel" in order && order.lineLabel ? (
                        <span className="block truncate text-xs text-admin-faint">
                          {order.lineLabel}
                          {"lineUnits" in order
                            ? ` · ${order.lineUnits} unit${order.lineUnits === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm text-admin-muted">
                      {formatFullCurrency(
                        "lineTotal" in order ? order.lineTotal : order.pricing.grandTotal
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      <Section
        title={view.mode === "combined" ? "Price timeline" : "Variant price timeline"}
        className="mt-6"
      >
        <Surface className="min-w-0">
          {view.priceHistory.length === 0 ? (
            <p className="text-sm text-admin-faint">No price history recorded yet.</p>
          ) : (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Price change history"
              tabIndex={0}
            >
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-admin-muted">
                    <th className="pb-2 font-medium">Date</th>
                    {view.mode === "combined" && (
                      <th className="pb-2 font-medium">Variant</th>
                    )}
                    <th className="pb-2 font-medium">Price (ex-GST)</th>
                    <th className="pb-2 font-medium">Price (incl. GST)</th>
                    <th className="pb-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...view.priceHistory].reverse().map((entry) => (
                    <tr key={entry._id} className="border-t border-admin-line">
                      <td className="py-2 whitespace-nowrap">
                        {new Date(entry.effectiveAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      {view.mode === "combined" && (
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setScope(entry.variantId)}
                            className="text-left hover:text-admin-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
                          >
                            <p className="font-medium text-admin-heading">
                              {entry.variantLabel}
                            </p>
                            <p className="text-xs text-admin-faint">{entry.sku}</p>
                          </button>
                        </td>
                      )}
                      <td className="py-2 tabular-nums">
                        {formatFullCurrency(entry.price)}
                        {entry.compareAtPrice ? (
                          <span className="ml-1 text-xs text-admin-faint line-through">
                            {formatFullCurrency(entry.compareAtPrice)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 tabular-nums">
                        {formatFullCurrency(entry.priceInclGst)}
                        {entry.originalPriceInclGst ? (
                          <span className="ml-1 text-xs text-admin-faint line-through">
                            {formatFullCurrency(entry.originalPriceInclGst)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 text-admin-muted">
                        <span className="capitalize">
                          {entry.source === "sale_end" ? "Sale ended" : entry.source}
                        </span>
                        {entry.saleTitle ? (
                          <span className="block text-xs text-admin-faint">
                            {entry.saleTitle}
                          </span>
                        ) : null}
                        {entry.changedBy ? (
                          <span className="block text-xs text-admin-faint">
                            by {entry.changedBy}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </Section>
    </div>
  );
}

function SalesTrendChart({
  data,
  mode,
}: {
  data: SalesTrendPoint[];
  mode: "combined" | "variant";
}) {
  const id = useId();
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
  const totalUnits = data.reduce((sum, row) => sum + row.units, 0);
  const summary =
    totalUnits > 0
      ? `${formatFullCurrency(totalRevenue)} and ${totalUnits.toLocaleString("en-IN")} units over the last 30 days`
      : "No paid sales in the last 30 days";

  return (
    <figure className="overflow-visible rounded-xl border border-admin-line bg-admin-surface p-4">
      <figcaption>
        <h3 className="text-sm font-semibold text-admin-heading">
          {mode === "combined" ? "Sales trend" : "Variant sales trend"}
        </h3>
        <p className="mt-0.5 text-xs text-admin-muted">{summary}</p>
      </figcaption>
      <div role="img" className="mt-3 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={chartMargin}>
            <defs>
              <linearGradient id={`${id}-salesGrad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.series} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chart.series} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={axisTick}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => [
                formatFullCurrency(Number(value ?? 0)),
                "Revenue",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={chart.series}
              strokeWidth={2}
              fill={`url(#${id}-salesGrad)`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function CombinedPriceTimelineChart({ data }: { data: CombinedPriceTimelinePoint[] }) {
  const latest = data[data.length - 1];
  const hasSaleNow = data.some((point) => point.hasSale);
  const summary =
    latest
      ? `${hasSaleNow ? "Sale pricing active · " : ""}Current range ${formatPriceRange(latest.minPrice, latest.maxPrice)} incl. GST across ${data.length} price event${data.length === 1 ? "" : "s"}`
      : "Price changes will appear here after the first edit or sale";

  return (
    <PriceChartShell title="Combined price timeline" summary={summary} empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value, name) => [
              formatFullCurrency(Number(value ?? 0)),
              name === "minPrice"
                ? "Min price"
                : name === "maxPrice"
                  ? "Max price"
                  : "Avg price",
            ]}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Line
            type="stepAfter"
            dataKey="minPrice"
            name="Min price"
            stroke={chart.series}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="stepAfter"
            dataKey="maxPrice"
            name="Max price"
            stroke={chart.emphasis}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="stepAfter"
            dataKey="avgPrice"
            name="Avg price"
            stroke={chart.seriesMuted}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </PriceChartShell>
  );
}

function VariantPriceTimelineChart({
  data,
  variantLabel,
}: {
  data: VariantPriceTimelinePoint[];
  variantLabel: string;
}) {
  const latest = data[data.length - 1];
  const hasSaleNow = data.some((point) => point.hasSale);
  const summary =
    latest
      ? `${hasSaleNow ? "Sale pricing active · " : ""}${variantLabel} is currently ${formatFullCurrency(latest.priceInclGst)} incl. GST`
      : "Price changes will appear here after the first edit or sale";

  return (
    <PriceChartShell title="Variant price timeline" summary={summary} empty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            formatter={(value) => [
              formatFullCurrency(Number(value ?? 0)),
              "Price incl. GST",
            ]}
          />
          <Line
            type="stepAfter"
            dataKey="priceInclGst"
            name="Price incl. GST"
            stroke={chart.series}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </PriceChartShell>
  );
}

function PriceChartShell({
  title,
  summary,
  empty,
  children,
}: {
  title: string;
  summary: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="overflow-visible rounded-xl border border-admin-line bg-admin-surface p-4">
      <figcaption>
        <h3 className="text-sm font-semibold text-admin-heading">{title}</h3>
        <p className="mt-0.5 text-xs text-admin-muted">{summary}</p>
      </figcaption>
      <div role="img" className="mt-3 h-60">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-admin-faint">
            No price changes recorded yet.
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}
