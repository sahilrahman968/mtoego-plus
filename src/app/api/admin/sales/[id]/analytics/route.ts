import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import { campaignStatus } from "@/lib/sales";
import SaleCampaign from "@/models/sale-campaign.model";
import Order from "@/models/order.model";

type RouteContext = { params: Promise<{ id: string }> };

const PAID_STATUSES = ["paid", "processing", "shipped", "delivered"];

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(_request, "sales.view");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid sale ID", 400);
    }

    await connectDB();

    const campaign = await SaleCampaign.findById(id).lean();
    if (!campaign) {
      return errorResponse("Sale not found", 404);
    }

    const campaignObjectId = new Types.ObjectId(id);

    const [productPerf, recentOrders, paidAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.saleCampaign": campaignObjectId,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.saleCampaign": campaignObjectId } },
        {
          $group: {
            _id: "$items.product",
            title: { $first: "$items.title" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
            orders: { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            productId: "$_id",
            title: 1,
            units: 1,
            revenue: 1,
            orders: { $size: "$orders" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 20 },
      ]),
      Order.find({
        status: { $in: PAID_STATUSES },
        "items.saleCampaign": campaignObjectId,
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("orderNumber status pricing.grandTotal createdAt items.title items.quantity")
        .lean(),
      Order.aggregate([
        {
          $match: {
            status: { $in: PAID_STATUSES },
            "items.saleCampaign": campaignObjectId,
          },
        },
        { $unwind: "$items" },
        { $match: { "items.saleCampaign": campaignObjectId } },
        {
          $group: {
            _id: null,
            orders: { $addToSet: "$_id" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        {
          $project: {
            _id: 0,
            orders: { $size: "$orders" },
            units: 1,
            revenue: 1,
          },
        },
      ]),
    ]);

    const paid = paidAgg[0] || { orders: 0, units: 0, revenue: 0 };
    const views = campaign.stats?.views || 0;
    const addToCarts = campaign.stats?.addToCarts || 0;

    return successResponse({
      campaign: {
        _id: campaign._id,
        title: campaign.title,
        slug: campaign.slug,
        status: campaignStatus(campaign),
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        itemCount: campaign.items?.length || 0,
      },
      counters: {
        views,
        addToCarts,
        orders: paid.orders,
        unitsSold: paid.units,
        revenue: paid.revenue,
        conversionRate: views > 0 ? Math.round((paid.orders / views) * 1000) / 10 : 0,
        cartRate: views > 0 ? Math.round((addToCarts / views) * 1000) / 10 : 0,
      },
      products: productPerf,
      recentOrders,
    });
  } catch (err) {
    console.error("GET /api/admin/sales/:id/analytics error:", err);
    return errorResponse("Failed to load sale analytics", 500);
  }
}
