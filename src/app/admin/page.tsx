import { headers } from "next/headers";
import { connectDB } from "@/lib/db/mongoose";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import Coupon from "@/models/coupon.model";
import Order from "@/models/order.model";
import QuickActions from "./QuickActions";
import DashboardClient from "./DashboardClient";
import DashboardPulse from "./DashboardPulse";
import {
  getMonthlyRevenue,
  getOrdersByStatus,
  getRecentOrders,
} from "@/lib/analytics/orders";

export default async function AdminDashboard() {
  const headersList = await headers();
  const isSuperAdmin = headersList.get("x-user-role") === "super_admin";

  let totalProducts = 0;
  let totalCategories = 0;
  let totalCoupons = 0;
  let totalOrders = 0;
  const monthlyRevenue: {
    month: string;
    year: number;
    revenue: number;
    orders: number;
  }[] = [];
  const ordersByStatus: Record<string, number> = {};
  let serializedRecentOrders: {
    _id: string;
    orderNumber: string;
    user: { name: string; email: string };
    status: string;
    grandTotal: number;
    createdAt: string;
  }[] = [];
  let dbError = false;

  try {
    await connectDB();

    const [
      _totalProducts,
      _totalCategories,
      _totalCoupons,
      _totalOrders,
      _monthlyRevenue,
      _ordersByStatus,
      _recentOrders,
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      Coupon.countDocuments(),
      Order.countDocuments(),
      getMonthlyRevenue(11),
      getOrdersByStatus(),
      getRecentOrders(5),
    ]);

    totalProducts = _totalProducts;
    totalCategories = _totalCategories;
    totalCoupons = _totalCoupons;
    totalOrders = _totalOrders;
    monthlyRevenue.push(..._monthlyRevenue);
    Object.assign(ordersByStatus, _ordersByStatus);
    serializedRecentOrders = _recentOrders;
  } catch (err) {
    console.error("[Dashboard] Failed to fetch data:", err);
    dbError = true;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-admin-heading">Dashboard</h1>
        <p className="mt-1 text-sm text-admin-muted">
          Overview of your store performance
        </p>
      </div>

      {dbError && (
        <div className="mb-6 p-4 bg-admin-warning-soft border border-admin-warning-line rounded-xl">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-admin-warning flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-admin-warning">
                Unable to connect to database
              </p>
              <p className="text-xs text-admin-warning/80 mt-0.5">
                Stats are temporarily unavailable. Try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      )}

      <DashboardPulse />

      <QuickActions
        isSuperAdmin={isSuperAdmin}
        totalProducts={totalProducts}
        totalCategories={totalCategories}
        totalCoupons={totalCoupons}
        totalOrders={totalOrders}
      />

      <DashboardClient
        monthlyRevenue={monthlyRevenue}
        ordersByStatus={ordersByStatus}
        recentOrders={serializedRecentOrders}
        totalCategories={totalCategories}
      />
    </div>
  );
}
