import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Order from "@/models/order.model";

// ─── GET /api/admin/orders — List all orders (admin) ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search"); // order number search
    const skip = (page - 1) * limit;

    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = status;
    }
    if (userId) {
      filter.user = userId;
    }
    if (search) {
      filter.orderNumber = { $regex: search.toUpperCase(), $options: "i" };
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "user",
          select: "name email",
        })
        .select(
          "orderNumber user status pricing.grandTotal items.title items.quantity payment.razorpayPaymentId payment.paidAt createdAt"
        )
        .lean(),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      {
        items: orders,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      "Orders retrieved"
    );
  } catch (err) {
    console.error("GET /api/admin/orders error:", err);
    return errorResponse("Failed to retrieve orders", 500);
  }
}
