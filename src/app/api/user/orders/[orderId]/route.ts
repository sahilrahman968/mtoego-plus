import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Order from "@/models/order.model";

// ─── GET /api/user/orders/:orderId — Order detail ────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { orderId } = await params;

    if (!isValidObjectId(orderId)) {
      return errorResponse("Invalid order ID", 400);
    }

    await connectDB();

    const order = await Order.findOne({
      _id: orderId,
      user: auth.userId,
    })
      .select("-payment.razorpaySignature -payment.webhookEvents -idempotencyKey")
      .populate({
        path: "items.product",
        select: "slug images",
      })
      .lean();

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    return successResponse(order, "Order retrieved");
  } catch (err) {
    console.error("GET /api/user/orders/[orderId] error:", err);
    return errorResponse("Failed to retrieve order", 500);
  }
}
