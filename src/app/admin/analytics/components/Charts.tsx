"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import InfoTooltip from "@/app/admin/components/InfoTooltip";
import { chart, chartTooltipStyle } from "@/app/admin/components/chartTheme";

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

const tooltipStyle = chartTooltipStyle;

function ChartCard({
  title,
  info,
  children,
}: {
  title: string;
  info?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-admin-surface rounded-xl border border-admin-line p-5 overflow-visible">
      <div className="mb-4">
        <h3 className="flex items-center gap-1.5 text-base font-semibold text-admin-heading">
          {title}
          {info && <InfoTooltip text={info} />}
        </h3>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

interface DailyPoint {
  label: string;
  revenue: number;
  orders: number;
  aov: number;
  discount: number;
  subtotal: number;
}

export function DailyRevenueChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Daily revenue" info="Total paid order revenue for each day in the selected period.">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.series} stopOpacity={0.2} />
              <stop offset="100%" stopColor={chart.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
          />
          <Area type="monotone" dataKey="revenue" stroke={chart.series} strokeWidth={2} fill="url(#dailyRevGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OrdersAovChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Orders & AOV" info="Daily paid order count alongside average order value (AOV) to spot volume vs basket-size trends.">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chart.axis, fontSize: 11 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar yAxisId="left" dataKey="orders" name="Orders" fill={chart.seriesMuted} radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV" stroke={chart.emphasis} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GrossVsDiscountChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Gross vs discount" info="Daily merchandise subtotal before discounts versus the discount amount given on paid orders.">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`]}
          />
          <Legend />
          <Area type="monotone" dataKey="subtotal" name="Subtotal" stroke={chart.series} fill={chart.grid} strokeWidth={2} />
          <Area type="monotone" dataKey="discount" name="Discount" stroke={chart.axis} fill={chart.seriesFill} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function FunnelChart({
  ordersByStatus,
}: {
  ordersByStatus: Record<string, number>;
}) {
  const statusOrder = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  const data = statusOrder.map((status) => ({
    status,
    count: ordersByStatus[status] || 0,
  }));
  const total = data.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <div className="bg-admin-surface rounded-xl border border-admin-line p-5 overflow-visible">
      <h3 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-admin-heading">
        Order status funnel
        <InfoTooltip text="Distribution of orders by fulfillment status in the selected period. Bars are relative to the total order count." />
      </h3>
      <div className="space-y-3">
        {data.map((row) => {
          const pct = Math.round((row.count / total) * 100);
          return (
            <div key={row.status} className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-admin-muted capitalize">{row.status}</span>
              <div className="flex-1">
                <div className="h-2 bg-admin-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-admin-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-admin-muted w-10 text-right">{row.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AbandonmentAgeChart({
  data,
}: {
  data: { label: string; value: number; count: number }[];
}) {
  return (
    <ChartCard title="Cart value by age" info="Value of non-empty carts that have not converted to a paid order, grouped by how long they have been sitting.">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value, _name, item) => {
              const count = (item?.payload as { count?: number })?.count ?? 0;
              return [
                `₹${Number(value ?? 0).toLocaleString("en-IN")} (${count} carts)`,
                "Value",
              ];
            }}
          />
          <Bar dataKey="value" fill={chart.series} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function PaymentSuccessChart({
  data,
}: {
  data: { label: string; paid: number; failed: number; successRate: number }[];
}) {
  return (
    <ChartCard title="Payment success (weekly)" info="Weekly paid checkouts vs cancelled unpaid checkouts, with success rate overlaid as a percentage.">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: chart.axis, fontSize: 11 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chart.axis, fontSize: 11 }}
            domain={[0, 100]}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar yAxisId="left" dataKey="paid" name="Paid" stackId="a" fill={chart.series} />
          <Bar yAxisId="left" dataKey="failed" name="Failed checkout" stackId="a" fill={chart.seriesMuted} />
          <Line yAxisId="right" type="monotone" dataKey="successRate" name="Success %" stroke={chart.emphasis} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SimpleBarList({
  title,
  info,
  data,
  nameKey,
  valueKey,
  valuePrefix = "",
}: {
  title: string;
  info?: string;
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  valuePrefix?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="bg-admin-surface rounded-xl border border-admin-line p-5 overflow-visible">
      <h3 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-admin-heading">
        {title}
        {info && <InfoTooltip text={info} />}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-admin-muted text-center py-6">No data yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((row, i) => {
            const val = Number(row[valueKey]) || 0;
            const pct = Math.round((val / max) * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-admin-muted truncate">
                  {String(row[nameKey])}
                </span>
                <div className="flex-1">
                  <div className="h-2 bg-admin-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-admin-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-admin-muted w-16 text-right">
                  {valuePrefix}
                  {typeof val === "number" && valuePrefix === "₹"
                    ? val.toLocaleString("en-IN")
                    : val}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
