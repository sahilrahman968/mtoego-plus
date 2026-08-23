"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import {
  PeriodSelection,
  buildPeriodQuery,
} from "@/lib/analytics/periods";
import { MetricWithDelta } from "@/lib/analytics/format";
import StatsCard, { KpiGrid } from "./components/StatsCard";
import { Button } from "./components/Button";
import { KpiSkeleton } from "./analytics/components/Skeletons";
import PeriodToggle from "./analytics/components/PeriodToggle";

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

// Narrower view of the pulse payload: performance metrics up top, then the
// operational counters that link straight to the queue that needs work.
interface PulseMetrics {
  totalRevenue?: MetricWithDelta;
  netRevenue?: MetricWithDelta;
  revenue: MetricWithDelta;
  orders: MetricWithDelta;
  aov: MetricWithDelta;
  paymentSuccessPct: MetricWithDelta;
  pendingRevenue: { value: number; count: number };
  abandonedCart: { count: number; value: number };
  lowStockCount: number;
  openCallbacks: number;
}

export default function DashboardPulse() {
  const [selection, setSelection] = useState<PeriodSelection>({ period: "30d" });
  const [metrics, setMetrics] = useState<PulseMetrics | null>(null);
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
      const res = await fetch(`/api/admin/analytics/pulse?${queryKey}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load");
      }
      setMetrics(json.data.metrics as PulseMetrics);
    } catch (e) {
      setMetrics(null);
      setError(e instanceof Error ? e.message : "Failed to load pulse");
    } finally {
      setLoading(false);
    }
  }, [queryKey, selection.period, selection.from, selection.to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section aria-labelledby="pulse-heading" aria-busy={loading || undefined}>
      <div className="mb-3 flex flex-col gap-3 border-b border-admin-line pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="pulse-heading" className="text-sm font-semibold text-admin-heading">
            Performance
          </h2>
          <p className="mt-0.5 text-xs text-admin-muted">
            Compared with the previous equal period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodToggle value={selection} onChange={setSelection} />
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1 text-sm font-medium text-admin-heading hover:underline"
          >
            Full analytics
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>
      </div>

      {loading ? (
        <KpiSkeleton count={4} columns={4} />
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-admin-danger-line bg-admin-danger-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-admin-danger">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={load}
            className="shrink-0"
            icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
          >
            Retry
          </Button>
        </div>
      ) : (
        metrics && (
          <div className="space-y-4">
            <KpiGrid columns={4}>
              <StatsCard
                title="Net revenue"
                value={formatCurrency(metrics.netRevenue?.value ?? metrics.revenue.value)}
                trend={trendFromDelta(metrics.netRevenue?.deltaPct ?? metrics.revenue.deltaPct)}
                info="Paid order revenue after refunds and post-payment cancellations."
              />
              <StatsCard
                title="Orders"
                value={metrics.orders.value.toLocaleString()}
                trend={trendFromDelta(metrics.orders.deltaPct)}
                info="Count of paid orders placed in the selected period."
              />
              <StatsCard
                title="AOV"
                value={formatCurrency(metrics.aov.value)}
                trend={trendFromDelta(metrics.aov.deltaPct)}
                info="Average order value — net revenue divided by paid orders in the selected period."
              />
              <StatsCard
                title="Payment success"
                value={`${metrics.paymentSuccessPct.value.toFixed(1)}%`}
                trend={trendFromDelta(metrics.paymentSuccessPct.deltaPct)}
                info="Share of checkout attempts that completed payment successfully (paid vs cancelled unpaid)."
              />
            </KpiGrid>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-admin-muted">
                Needs attention
              </h3>
              <KpiGrid columns={4}>
                <StatsCard
                  title="Pending payment"
                  value={formatCurrency(metrics.pendingRevenue.value)}
                  trend={{
                    value: `${metrics.pendingRevenue.count} orders`,
                    positive: true,
                  }}
                  info="Value of orders that are still awaiting payment and have not been cancelled."
                  href="/admin/orders"
                  actionLabel="Chase payment"
                />
                <StatsCard
                  title="Low-stock SKUs"
                  value={metrics.lowStockCount}
                  info="Number of product variants currently at or below the low-stock threshold."
                  href="/admin/products"
                  actionLabel="Restock"
                />
                <StatsCard
                  title="Abandoned carts"
                  value={formatCurrency(metrics.abandonedCart.value)}
                  trend={{
                    value: `${metrics.abandonedCart.count} carts`,
                    positive: false,
                  }}
                  info="Estimated value of non-empty carts that never converted to a paid order."
                  href="/admin/analytics"
                  actionLabel="Recover"
                />
                <StatsCard
                  title="Open callbacks"
                  value={metrics.openCallbacks}
                  info="Customisation / callback requests that are still open and need follow-up."
                  href="/admin/callback-requests"
                  actionLabel="Follow up"
                />
              </KpiGrid>
            </div>
          </div>
        )
      )}
    </section>
  );
}
