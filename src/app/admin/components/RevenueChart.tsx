"use client";

import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { chart, chartTooltipStyle } from "./chartTheme";

interface ChartData {
  month: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data: ChartData[];
}

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

function formatFullCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;

  const total = data.reduce((sum, point) => sum + (point.revenue || 0), 0);
  const orders = data.reduce((sum, point) => sum + (point.orders || 0), 0);
  const peak = data.reduce<ChartData | null>(
    (best, point) => (!best || point.revenue > best.revenue ? point : best),
    null
  );
  const summary = peak
    ? `${formatFullCurrency(total)} from ${orders.toLocaleString(
        "en-IN"
      )} orders · best month ${peak.month} at ${formatFullCurrency(peak.revenue)}`
    : "No revenue recorded in the last 12 months";

  return (
    <figure className="rounded-xl border border-admin-line bg-admin-surface p-4">
      <figcaption>
        <h3 id={titleId} className="text-sm font-semibold text-admin-heading">
          Revenue overview
        </h3>
        <p id={summaryId} className="mt-0.5 text-xs text-admin-muted">
          Last 12 months · {summary}
        </p>
      </figcaption>
      <div
        role="img"
        aria-labelledby={titleId}
        aria-describedby={summaryId}
        className="mt-3 h-60"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chart.series} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chart.series} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 11 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => {
                const numericValue = Array.isArray(value)
                  ? Number(value[0] ?? 0)
                  : Number(value ?? 0);
                return [`₹${numericValue.toLocaleString("en-IN")}`, "Revenue"];
              }}
              labelStyle={{ color: chart.series, fontWeight: 600 }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={chart.series}
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
