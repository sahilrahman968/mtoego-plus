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
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {statusOrder.map((status) => {
              const count = ordersByStatus[status] || 0;
              const total = Object.values(ordersByStatus).reduce((a, b) => a + b, 0) || 1;
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <StatusBadge status={status} className="w-24 justify-center" />
                  <div className="flex-1">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-800 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 w-10 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Orders</h3>
            <Link href="/admin/orders" className="text-sm text-gray-900 hover:text-black font-medium">
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order._id}
                  href={`/admin/orders/${order._id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors -mx-1"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{order.orderNumber}</p>
                    <p className="text-xs text-slate-500 truncate">{order.user.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-medium text-slate-900">
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
