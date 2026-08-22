"use client";

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

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-admin-heading">Revenue Overview</h3>
          <p className="text-sm text-admin-muted">Monthly revenue for the last 12 months</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
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
              tick={{ fill: chart.axis, fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: chart.axis, fontSize: 12 }}
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
    </div>
  );
}
