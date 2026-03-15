import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import Order from "@/models/order.model";
import Product from "@/models/product.model";
import User from "@/models/user.model";
import Category from "@/models/category.model";

// ─── GET /api/admin/dashboard ────────────────────────────────────────────────
// Returns aggregated dashboard statistics for the admin panel.

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    // Run all queries in parallel
    const [
      totalOrders,
      totalProducts,
      totalCustomers,
      totalCategories,
      revenueAgg,
      recentOrders,
      monthlyRevenueAgg,
      ordersByStatusAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Category.countDocuments(),
      // Total revenue from paid/processing/shipped/delivered orders
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
      // Recent 5 orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .lean(),
      // Monthly revenue for the last 12 months
      Order.aggregate([
        {
          $match: {
            status: { $in: ["paid", "processing", "shipped", "delivered"] },
            createdAt: {
              $gte: new Date(
                new Date().setMonth(new Date().getMonth() - 11, 1)
              ),
            },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$pricing.grandTotal" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      // Orders grouped by status
      Order.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const revenue = revenueAgg[0] || { totalRevenue: 0, totalSales: 0 };

    // Build monthly revenue data for chart
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const now = new Date();
    const monthlyRevenue = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const found = monthlyRevenueAgg.find(
        (m: { _id: { year: number; month: number } }) =>
          m._id.year === year && m._id.month === month
      );
      monthlyRevenue.push({
        month: months[d.getMonth()],
        year,
        revenue: found ? found.revenue : 0,
        orders: found ? found.orders : 0,
      });
    }

    // Orders by status map
    const ordersByStatus: Record<string, number> = {};
    ordersByStatusAgg.forEach(
      (item: { _id: string; count: number }) => {
        ordersByStatus[item._id] = item.count;
      }
    );

    return successResponse({
      stats: {
        totalOrders,
        totalProducts,
        totalCustomers,
        totalCategories,
        totalRevenue: revenue.totalRevenue,
        totalSales: revenue.totalSales,
      },
      monthlyRevenue,
      ordersByStatus,
      recentOrders: recentOrders.map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        user: order.user,
        status: order.status,
        grandTotal: order.pricing.grandTotal,
        createdAt: order.createdAt,
      })),
    });
  } catch (err) {
    console.error("[Dashboard] Error:", err);
    return errorResponse("Failed to fetch dashboard data");
  }
}
