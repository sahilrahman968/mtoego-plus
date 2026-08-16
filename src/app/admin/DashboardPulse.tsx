"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PeriodSelection,
  buildPeriodQuery,
} from "@/lib/analytics/periods";
import { MetricWithDelta } from "@/lib/analytics/format";
import StatsCard from "./components/StatsCard";
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

interface PulseMetrics {
  revenue: MetricWithDelta;
  orders: MetricWithDelta;
  aov: MetricWithDelta;
  paymentSuccessPct: MetricWithDelta;
  abandonedCart: { count: number; value: number };
  lowStockCount: number;
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
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PeriodToggle value={selection} onChange={setSelection} />
          {loading && (
            <span className="text-xs text-slate-400">Updating…</span>
          )}
        </div>
        <Link
          href="/admin/analytics"
          className="text-sm font-medium text-slate-900 hover:underline"
        >
          View full analytics →
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Revenue"
          value={metrics ? formatCurrency(metrics.revenue.value) : "—"}
          color="emerald"
          trend={metrics ? trendFromDelta(metrics.revenue.deltaPct) : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Orders"
          value={metrics ? metrics.orders.value.toLocaleString() : "—"}
          color="indigo"
          trend={metrics ? trendFromDelta(metrics.orders.deltaPct) : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="AOV"
          value={metrics ? formatCurrency(metrics.aov.value) : "—"}
          color="amber"
          trend={metrics ? trendFromDelta(metrics.aov.deltaPct) : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <StatsCard
          title="Payment success"
          value={metrics ? `${metrics.paymentSuccessPct.value.toFixed(1)}%` : "—"}
          color="rose"
          trend={
            metrics
              ? trendFromDelta(metrics.paymentSuccessPct.deltaPct)
              : undefined
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Abandoned carts"
          value={metrics ? formatCurrency(metrics.abandonedCart.value) : "—"}
          color="rose"
          trend={
            metrics
              ? {
                  value: `${metrics.abandonedCart.count} carts`,
                  positive: false,
                }
              : undefined
          }
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Low-stock SKUs"
          value={metrics ? metrics.lowStockCount : "—"}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
