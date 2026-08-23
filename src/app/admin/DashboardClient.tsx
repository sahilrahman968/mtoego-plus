"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RevenueChart from "./components/RevenueChart";
import StatusBadge from "./components/StatusBadge";
import EmptyState from "./components/EmptyState";
import DataTableShell from "./components/DataTableShell";
import { BarRows } from "./analytics/components/Charts";

interface RecentOrder {
  _id: string;
  orderNumber: string;
  user: { name: string; email: string };
  status: string;
  grandTotal: number;
  createdAt: string;
}

interface DashboardClientProps {
  monthlyRevenue: { month: string; year: number; revenue: number; orders: number }[];
  ordersByStatus: Record<string, number>;
  recentOrders: RecentOrder[];
  totalCategories: number;
}

const statusOrder = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export default function DashboardClient({
  monthlyRevenue,
  ordersByStatus,
  recentOrders,
}: DashboardClientProps) {
  const totalOrdersByStatus =
    Object.values(ordersByStatus).reduce((a, b) => a + b, 0) || 0;
  const divisor = totalOrdersByStatus || 1;

  return (
    <div className="space-y-6">
      <RevenueChart data={monthlyRevenue} />

      <section aria-labelledby="operations-heading" className="space-y-3">
        <div className="border-b border-admin-line pb-2">
          <h2
            id="operations-heading"
            className="text-sm font-semibold text-admin-heading"
          >
            Operations
          </h2>
          <p className="mt-0.5 text-xs text-admin-muted">
            Where orders sit right now and what came in last
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-admin-line bg-admin-surface p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-admin-heading">
              Orders by status
            </h3>
            <p className="mt-0.5 text-xs text-admin-muted">
              {totalOrdersByStatus.toLocaleString("en-IN")} orders all time
            </p>
            <div className="mt-3">
              <BarRows
                rows={statusOrder.map((status) => {
                  const count = ordersByStatus[status] || 0;
                  return {
                    key: status,
                    label: status,
                    value: count.toLocaleString("en-IN"),
                    pct: Math.round((count / divisor) * 100),
                  };
                })}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-admin-heading">
                Recent orders
              </h3>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1 text-sm font-medium text-admin-heading hover:underline"
              >
                View all
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
            <DataTableShell label="Recent orders">
              {recentOrders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Orders will appear here once customers start purchasing."
                />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-admin-line bg-admin-subtle/60">
                      <th
                        scope="col"
                        className="px-4 py-2 text-left text-xs font-medium text-admin-muted"
                      >
                        Order
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted sm:table-cell"
                      >
                        Customer
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-left text-xs font-medium text-admin-muted"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-2 text-right text-xs font-medium text-admin-muted"
                      >
                        Total
                      </th>
                      <th
                        scope="col"
                        className="hidden px-4 py-2 text-right text-xs font-medium text-admin-muted md:table-cell"
                      >
                        Placed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-line">
                    {recentOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="transition-colors hover:bg-admin-hover"
                      >
                        <td className="px-4 py-2">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="font-medium text-admin-heading hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="text-xs text-admin-muted sm:hidden">
                            {order.user.name}
                          </p>
                        </td>
                        <td className="hidden px-4 py-2 sm:table-cell">
                          <div className="min-w-0">
                            <p className="truncate text-admin-body">{order.user.name}</p>
                            <p className="truncate text-xs text-admin-muted">
                              {order.user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-admin-heading tabular-nums">
                          ₹{order.grandTotal.toLocaleString("en-IN")}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-right text-admin-muted tabular-nums md:table-cell">
                          {new Date(order.createdAt).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataTableShell>
          </div>
        </div>
      </section>
    </div>
  );
}
