import { headers } from "next/headers";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import User from "@/models/user.model";
import Category from "@/models/category.model";
import Coupon from "@/models/coupon.model";
import StatsCard from "./components/StatsCard";
import QuickActions from "./QuickActions";
import DashboardClient from "./DashboardClient";

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default async function AdminDashboard() {
  // Get role from proxy headers (no DB needed)
  const headersList = await headers();
  const isSuperAdmin = headersList.get("x-user-role") === "super_admin";

  // Fetch dashboard data — wrapped in try-catch so the page still renders
  // if the database is temporarily unreachable.
  let totalOrders = 0;
  let totalProducts = 0;
  let totalCustomers = 0;
  let totalCategories = 0;
  let totalCoupons = 0;
  let revenue = { totalRevenue: 0, totalSales: 0 };
  let monthlyRevenue: { month: string; year: number; revenue: number; orders: number }[] = [];
  let ordersByStatus: Record<string, number> = {};
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
      _totalOrders,
      _totalProducts,
      _totalCustomers,
      _totalCategories,
      _totalCoupons,
      revenueAgg,
      recentOrders,
      monthlyRevenueAgg,
      ordersByStatusAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Category.countDocuments(),
      Coupon.countDocuments(),
      Order.aggregate([
        {
          $match: {
            status: { $in: ["paid", "processing", "shipped", "delivered"] },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$pricing.grandTotal" },
            totalSales: { $sum: 1 },
          },
        },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .lean(),
      Order.aggregate([
        {
          $match: {
            status: { $in: ["paid", "processing", "shipped", "delivered"] },
            createdAt: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 11, 1)),
            },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            revenue: { $sum: "$pricing.grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    totalOrders = _totalOrders;
    totalProducts = _totalProducts;
    totalCustomers = _totalCustomers;
    totalCategories = _totalCategories;
    totalCoupons = _totalCoupons;
    revenue = revenueAgg[0] || { totalRevenue: 0, totalSales: 0 };

    // Build monthly revenue chart data
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = monthlyRevenueAgg.find(
        (m: { _id: { year: number; month: number } }) => m._id.year === year && m._id.month === month
      );
      monthlyRevenue.push({
        month: months[d.getMonth()],
        year,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0,
      });
    }

    // Orders by status
    ordersByStatusAgg.forEach((item: { _id: string; count: number }) => {
      ordersByStatus[item._id] = item.count;
    });

    // Serialize recent orders for client
    serializedRecentOrders = recentOrders.map((order) => ({
      _id: String(order._id),
      orderNumber: order.orderNumber,
      user: order.user
        ? { name: (order.user as { name?: string }).name || "N/A", email: (order.user as { email?: string }).email || "" }
        : { name: "Deleted User", email: "" },
      status: order.status,
      grandTotal: order.pricing.grandTotal,
      createdAt: order.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[Dashboard] Failed to fetch data:", err);
    dbError = true;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your store performance</p>
      </div>

      {dbError && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-800">Unable to connect to database</p>
              <p className="text-xs text-gray-600 mt-0.5">Stats are temporarily unavailable. Try refreshing the page.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(revenue.totalRevenue)}
          color="emerald"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          color="indigo"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatsCard
          title="Products"
          value={totalProducts.toLocaleString()}
          color="amber"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <StatsCard
          title="Customers"
          value={totalCustomers.toLocaleString()}
          color="rose"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <QuickActions
        isSuperAdmin={isSuperAdmin}
        totalProducts={totalProducts}
        totalCategories={totalCategories}
        totalCoupons={totalCoupons}
        totalOrders={totalOrders}
      />

      {/* Charts + Recent Orders — client component */}
      <DashboardClient
        monthlyRevenue={monthlyRevenue}
        ordersByStatus={ordersByStatus}
        recentOrders={serializedRecentOrders}
        totalCategories={totalCategories}
      />
    </div>
  );
}
