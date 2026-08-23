import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import Order from "@/models/order.model";
import User from "@/models/user.model";

function isObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value) && new Types.ObjectId(value).toString() === value;
}

// ─── GET /api/admin/orders — List all orders (admin) ─────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "orders.list");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const search = searchParams.get("search")?.trim() || "";
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
      const nameEmailRegex = { $regex: search, $options: "i" };
      const matchingUsers = await User.find({
        $or: [{ name: nameEmailRegex }, { email: nameEmailRegex }],
      })
        .select("_id")
        .limit(200)
        .lean();

      const orConditions: Record<string, unknown>[] = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.name": nameEmailRegex },
      ];

      if (matchingUsers.length > 0) {
        orConditions.push({ user: { $in: matchingUsers.map((u) => u._id) } });
      }

      if (isObjectId(search)) {
        orConditions.push({ _id: search });
      }

      filter.$or = orConditions;
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
