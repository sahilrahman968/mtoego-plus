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

function formatCurrency(value: number): string {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value}`;
}

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "0.5rem",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)",
  fontSize: "0.875rem",
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
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
    <ChartCard title="Daily revenue" description="Paid orders in the selected period">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#374151" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#374151" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
          />
          <Area type="monotone" dataKey="revenue" stroke="#374151" strokeWidth={2} fill="url(#dailyRevGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function OrdersAovChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Orders & AOV" description="Volume vs average order value">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#6B7280" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="aov" name="AOV" stroke="#111827" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function GrossVsDiscountChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard title="Gross vs discount" description="Subtotal and discounts given">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={formatCurrency} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value) => [`₹${Number(value ?? 0).toLocaleString("en-IN")}`]}
          />
          <Legend />
          <Area type="monotone" dataKey="subtotal" name="Subtotal" stroke="#374151" fill="#E5E7EB" strokeWidth={2} />
          <Area type="monotone" dataKey="discount" name="Discount" stroke="#9CA3AF" fill="#F3F4F6" strokeWidth={2} />
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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">Order status funnel</h3>
      <div className="space-y-3">
        {data.map((row) => {
          const pct = Math.round((row.count / total) * 100);
          return (
            <div key={row.status} className="flex items-center gap-3">
              <span className="w-24 text-xs font-medium text-slate-600 capitalize">{row.status}</span>
              <div className="flex-1">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-800 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-slate-600 w-10 text-right">{row.count}</span>
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
    <ChartCard title="Cart value by age" description="Non-empty carts without a later paid order">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} tickFormatter={formatCurrency} />
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
          <Bar dataKey="value" fill="#4B5563" radius={[4, 4, 0, 0]} />
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
    <ChartCard title="Payment success (weekly)" description="Paid vs cancelled unpaid checkouts">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            domain={[0, 100]}
          />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar yAxisId="left" dataKey="paid" name="Paid" stackId="a" fill="#374151" />
          <Bar yAxisId="left" dataKey="failed" name="Failed checkout" stackId="a" fill="#D1D5DB" />
          <Line yAxisId="right" type="monotone" dataKey="successRate" name="Success %" stroke="#111827" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function SimpleBarList({
  title,
  data,
  nameKey,
  valueKey,
  valuePrefix = "",
}: {
  title: string;
  data: Record<string, string | number>[];
  nameKey: string;
  valueKey: string;
  valuePrefix?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No data yet</p>
      ) : (
        <div className="space-y-3">
          {data.map((row, i) => {
            const val = Number(row[valueKey]) || 0;
            const pct = Math.round((val / max) * 100);
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="w-28 text-xs font-medium text-slate-600 truncate">
                  {String(row[nameKey])}
                </span>
                <div className="flex-1">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-800 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600 w-16 text-right">
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
