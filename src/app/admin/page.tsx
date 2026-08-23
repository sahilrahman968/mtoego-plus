import { headers } from "next/headers";
import { AlertTriangle } from "lucide-react";
import { connectDB } from "@/lib/db/mongoose";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import Coupon from "@/models/coupon.model";
import Order from "@/models/order.model";
import QuickActions from "./QuickActions";
import DashboardClient from "./DashboardClient";
import DashboardPulse from "./DashboardPulse";
import PageHeader from "./components/PageHeader";
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
      <PageHeader
        title="Dashboard"
        description="Overview of your store performance"
      />

      {dbError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2 rounded-lg border border-admin-warning-line bg-admin-warning-soft px-4 py-3"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-admin-warning"
          />
          <div>
            <p className="text-sm font-medium text-admin-warning">
              Unable to connect to database
            </p>
            <p className="mt-0.5 text-xs text-admin-warning/80">
              Stats are temporarily unavailable. Try refreshing the page.
            </p>
          </div>
        </div>
      )}

      {/* Performance first, then the operational queues, then the tools. */}
      <div className="space-y-8">
        <DashboardPulse />

        <DashboardClient
          monthlyRevenue={monthlyRevenue}
          ordersByStatus={ordersByStatus}
          recentOrders={serializedRecentOrders}
          totalCategories={totalCategories}
        />

        <QuickActions
          isSuperAdmin={isSuperAdmin}
          totalProducts={totalProducts}
          totalCategories={totalCategories}
          totalCoupons={totalCoupons}
          totalOrders={totalOrders}
        />
      </div>
    </div>
  );
}
