import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validatePaymentVerification } from "@/lib/validators";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { deductInventoryForOrder } from "@/lib/inventory";
import Order from "@/models/order.model";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";

// ─── POST /api/user/checkout/verify ──────────────────────────────────────────
// Called by the frontend after Razorpay Checkout returns successfully.
//
// 1. Verify the payment signature (cryptographic proof from Razorpay)
// 2. Move order from "pending" → "paid"
// 3. Deduct inventory atomically
// 4. Increment coupon usage
// 5. Clear the user's cart
//
// This endpoint is the primary payment confirmation path. The webhook
// serves as a fallback/secondary confirmation.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validatePaymentVerification(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // ── Verify signature ─────────────────────────────────────────────────
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      console.error(
        `Payment signature verification failed for order: ${razorpay_order_id}`
      );
      return errorResponse("Payment verification failed — invalid signature", 400);
    }

    await connectDB();

    // ── Find the order ───────────────────────────────────────────────────
    const order = await Order.findOne({
      "payment.razorpayOrderId": razorpay_order_id,
      user: auth.userId,
    });

    if (!order) {
      return errorResponse("Order not found", 404);
    }

    // ── Idempotency — already paid ───────────────────────────────────────
    if (order.status !== "pending") {
      return successResponse(
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        `Order already in "${order.status}" status`
      );
    }

    // ── Update order to "paid" ───────────────────────────────────────────
    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.amountPaid = order.pricing.grandTotal * 100; // paise
    order.payment.paidAt = new Date();
    order.status = "paid";
    order.statusHistory.push({
      status: "paid",
      timestamp: new Date(),
      note: "Payment verified via client callback",
    });

    await order.save();

    // ── Deduct inventory ─────────────────────────────────────────────────
    try {
      await deductInventoryForOrder(order._id.toString());
    } catch (inventoryErr) {
      // Log but don't fail — the order is still paid.
      // Admin should manually review inventory issues.
      console.error(
        `Inventory deduction failed for order ${order.orderNumber}:`,
        inventoryErr
      );
    }

    // ── Increment coupon usage ───────────────────────────────────────────
    if (order.coupon?.code) {
      try {
        const coupon = await Coupon.findOne({ code: order.coupon.code });
        if (coupon) {
          const userEntry = coupon.usedBy.find(
            (u) => u.user.toString() === auth.userId
          );
          if (userEntry) {
            userEntry.count += 1;
          } else {
            coupon.usedBy.push({ user: order.user, count: 1 });
          }
          coupon.usedCount += 1;
          await coupon.save();
        }
      } catch (couponErr) {
        console.error(
          `Coupon usage update failed for order ${order.orderNumber}:`,
          couponErr
        );
      }
    }

    // ── Clear cart ───────────────────────────────────────────────────────
    try {
      await Cart.findOneAndDelete({ user: auth.userId });
    } catch (cartErr) {
      console.error(
        `Cart clear failed for user ${auth.userId}:`,
        cartErr
      );
    }

    return successResponse(
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        payment: {
          razorpayPaymentId: razorpay_payment_id,
          amount: order.pricing.grandTotal,
          paidAt: order.payment.paidAt,
        },
      },
      "Payment verified successfully — order confirmed"
    );
  } catch (err) {
    console.error("POST /api/user/checkout/verify error:", err);
    return errorResponse("Payment verification failed", 500);
  }
}
