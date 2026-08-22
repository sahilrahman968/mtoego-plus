"use client";

import Link from "next/link";
import RevenueChart from "./components/RevenueChart";
import StatusBadge from "./components/StatusBadge";

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

export default function DashboardClient({
  monthlyRevenue,
  ordersByStatus,
  recentOrders,
}: DashboardClientProps) {
  const statusOrder = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];

  return (
    <div className="space-y-6">
      {/* Revenue Chart */}
      <RevenueChart data={monthlyRevenue} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
          <h3 className="text-base font-semibold text-admin-heading mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {statusOrder.map((status) => {
              const count = ordersByStatus[status] || 0;
              const total = Object.values(ordersByStatus).reduce((a, b) => a + b, 0) || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <StatusBadge status={status} className="w-24 justify-center" />
                  <div className="flex-1">
                    <div className="h-2 bg-admin-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-admin-primary rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-admin-muted w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-admin-heading">Recent Orders</h3>
            <Link href="/admin/orders" className="text-sm text-admin-muted hover:text-admin-heading font-medium transition-colors">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-admin-muted py-8 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order._id}
                  href={`/admin/orders/${order._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-admin-hover transition-colors -mx-1"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-admin-heading">{order.orderNumber}</p>
                    <p className="text-xs text-admin-muted truncate">{order.user.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-medium text-admin-heading">
                      ₹{order.grandTotal.toLocaleString("en-IN")}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
