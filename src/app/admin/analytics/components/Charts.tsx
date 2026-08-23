"use client";

import { useId } from "react";
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

function formatFullCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

const tooltipStyle = chartTooltipStyle;

const axisTick = { fill: chart.axis, fontSize: 11 };
const chartMargin = { top: 4, right: 4, left: -12, bottom: 0 };
const legendStyle = { fontSize: 11, paddingTop: 8 };

// Every plot carries a one-line written summary. It doubles as the chart's
// accessible description, so the trend is readable without parsing the SVG.
function ChartCard({
  title,
  info,
  summary,
  children,
}: {
  title: string;
  info?: string;
  summary: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const summaryId = `${id}-summary`;

  return (
    <figure className="overflow-visible rounded-xl border border-admin-line bg-admin-surface p-4">
      <figcaption>
        <h3
          id={titleId}
          className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading"
        >
          {title}
          {info && <InfoTooltip text={info} />}
        </h3>
        <p id={summaryId} className="mt-0.5 text-xs text-admin-muted">
          {summary}
        </p>
      </figcaption>
      <div
        role="img"
        aria-labelledby={titleId}
        aria-describedby={summaryId}
        className="mt-3 h-60"
      >
        {children}
      </div>
    </figure>
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

function sumBy<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + (pick(row) || 0), 0);
}

export function DailyRevenueChart({ data }: { data: DailyPoint[] }) {
  const total = sumBy(data, (d) => d.revenue);
  const peak = data.reduce<DailyPoint | null>(
    (best, point) => (!best || point.revenue > best.revenue ? point : best),
    null
  );
  const summary = peak
    ? `${formatFullCurrency(total)} over ${data.length} days · peak ${formatFullCurrency(
        peak.revenue
      )} on ${peak.label}`
    : "No revenue recorded in this period";

  return (
    <ChartCard
      title="Daily revenue"
      info="Total paid order revenue for each day in the selected period."
      summary={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <defs>
            <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.series} stopOpacity={0.2} />
              <stop offset="100%" stopColor={chart.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={formatCurrency} />
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
  const orders = sumBy(data, (d) => d.orders);
  const revenue = sumBy(data, (d) => d.revenue);
  const avgAov = orders > 0 ? revenue / orders : 0;
  const summary =
    orders > 0
      ? `${orders.toLocaleString("en-IN")} orders · average order value ${formatFullCurrency(avgAov)}`
      : "No paid orders in this period";

  return (
    <ChartCard
      title="Orders & AOV"
      info="Daily paid order count alongside average order value (AOV) to spot volume vs basket-size trends."
      summary={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            tickFormatter={formatCurrency}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} iconSize={8} />
          <Bar yAxisId="left" dataKey="orders" name="Orders" fill={chart.seriesMuted} radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV" stroke={chart.emphasis} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GrossVsDiscountChart({ data }: { data: DailyPoint[] }) {
  const subtotal = sumBy(data, (d) => d.subtotal);
  const discount = sumBy(data, (d) => d.discount);
  const sharePct = subtotal > 0 ? Math.round((discount / subtotal) * 1000) / 10 : 0;
  const summary =
    subtotal > 0
      ? `Subtotal ${formatFullCurrency(subtotal)} · discount ${formatFullCurrency(
          discount
        )} (${sharePct}% of subtotal)`
      : "No paid subtotal in this period";

  return (
    <ChartCard
      title="Gross vs discount"
      info="Daily merchandise subtotal before discounts versus the discount amount given on paid orders."
      summary={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`]}
          />
          <Legend wrapperStyle={legendStyle} iconSize={8} />
          <Area type="monotone" dataKey="subtotal" name="Subtotal" stroke={chart.series} fill={chart.grid} strokeWidth={2} />
          <Area type="monotone" dataKey="discount" name="Discount" stroke={chart.axis} fill={chart.seriesFill} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Shared row layout for the bar-style breakdowns, which stay as text + bar. */
export function BarRows({
  rows,
  labelWidth = "w-24",
}: {
  rows: { key: string; label: string; value: string; pct: number }[];
  labelWidth?: string;
}) {
  return (
    <dl className="space-y-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <dt
            className={`${labelWidth} shrink-0 truncate text-xs font-medium capitalize text-admin-muted`}
          >
            {row.label}
          </dt>
          <div className="flex-1">
            <div
              aria-hidden="true"
              className="h-1.5 overflow-hidden rounded-full bg-admin-subtle"
            >
              <div
                className="h-full rounded-full bg-admin-primary"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </div>
          <dd className="w-16 shrink-0 text-right text-xs font-medium text-admin-body tabular-nums">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
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
    <div className="overflow-visible rounded-xl border border-admin-line bg-admin-surface p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading">
        Order status funnel
        <InfoTooltip text="Distribution of orders by fulfillment status in the selected period. Bars are relative to the total order count." />
      </h3>
      <p className="mt-0.5 text-xs text-admin-muted">
        {total.toLocaleString("en-IN")} orders across {statusOrder.length} statuses
      </p>
      <div className="mt-3">
        <BarRows
          rows={data.map((row) => ({
            key: row.status,
            label: row.status,
            value: row.count.toLocaleString("en-IN"),
            pct: Math.round((row.count / total) * 100),
          }))}
        />
      </div>
    </div>
  );
}

export function AbandonmentAgeChart({
  data,
}: {
  data: { label: string; value: number; count: number }[];
}) {
  const totalValue = sumBy(data, (d) => d.value);
  const carts = sumBy(data, (d) => d.count);
  const summary =
    carts > 0
      ? `${formatFullCurrency(totalValue)} sitting in ${carts.toLocaleString("en-IN")} carts`
      : "No unconverted carts in this period";

  return (
    <ChartCard
      title="Cart value by age"
      info="Value of non-empty carts that have not converted to a paid order, grouped by how long they have been sitting."
      summary={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis axisLine={false} tickLine={false} tick={axisTick} tickFormatter={formatCurrency} />
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
          <Bar dataKey="value" fill={chart.series} radius={[3, 3, 0, 0]} />
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
  const paid = sumBy(data, (d) => d.paid);
  const failed = sumBy(data, (d) => d.failed);
  const attempts = paid + failed;
  const ratePct = attempts > 0 ? Math.round((paid / attempts) * 1000) / 10 : 0;
  const summary =
    attempts > 0
      ? `${ratePct}% success across ${data.length} weeks · ${paid.toLocaleString(
          "en-IN"
        )} paid, ${failed.toLocaleString("en-IN")} failed`
      : "No checkout attempts in this period";

  return (
    <ChartCard
      title="Payment success (weekly)"
      info="Weekly paid checkouts vs cancelled unpaid checkouts, with success rate overlaid as a percentage."
      summary={summary}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={axisTick} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            domain={[0, 100]}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={legendStyle} iconSize={8} />
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
    <div className="overflow-visible rounded-xl border border-admin-line bg-admin-surface p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading">
        {title}
        {info && <InfoTooltip text={info} />}
      </h3>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-admin-muted">No data yet</p>
      ) : (
        <div className="mt-3">
          <BarRows
            labelWidth="w-28"
            rows={data.map((row, i) => {
              const val = Number(row[valueKey]) || 0;
              return {
                key: `${String(row[nameKey])}-${i}`,
                label: String(row[nameKey]),
                value: `${valuePrefix}${
                  valuePrefix === "₹" ? val.toLocaleString("en-IN") : val
                }`,
                pct: Math.round((val / max) * 100),
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
