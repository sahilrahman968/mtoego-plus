import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { deductInventoryForOrder } from "@/lib/inventory";
import Order from "@/models/order.model";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";

// ─── POST /api/webhooks/razorpay ─────────────────────────────────────────────
// Razorpay webhook handler. This is the fallback/secondary path for
// confirming payments. The primary path is the client-side verify endpoint.
//
// Security:
// - Verifies X-Razorpay-Signature using HMAC SHA256
// - Idempotent: checks webhookEvents array to skip duplicate events
// - No auth middleware needed (public endpoint, signature-verified)
//
// Handled events:
// - payment.authorized  — Payment captured (auto-capture mode)
// - payment.captured    — Payment captured
// - payment.failed      — Payment failed
// - order.paid          — Razorpay order fully paid

export async function POST(request: NextRequest) {
  try {
    // ── Read raw body for signature verification ─────────────────────────
    const rawBody = await request.text();

    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json(
        { success: false, message: "Missing signature" },
        { status: 401 }
      );
    }

    // ── Verify webhook signature ─────────────────────────────────────────
    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error("Razorpay webhook signature verification failed");
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 401 }
      );
    }

    // ── Parse event ──────────────────────────────────────────────────────
    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const eventType = event.event;
    const eventId = event.payload?.payment?.entity?.id ?? "unknown";

    console.log(`[Webhook] Received event: ${eventType}, payment: ${eventId}`);

    await connectDB();

    // ── Route event to handler ───────────────────────────────────────────
    switch (eventType) {
      case "payment.authorized":
      case "payment.captured":
      case "order.paid":
        await handlePaymentSuccess(event);
        break;

      case "payment.failed":
        await handlePaymentFailure(event);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    // Always return 200 to Razorpay so it doesn't retry
    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err) {
    console.error("[Webhook] Error processing webhook:", err);
    // Still return 200 to prevent Razorpay retries on server errors
    // The issue will be caught by monitoring/logs
    return NextResponse.json({ success: true, message: "Webhook acknowledged" });
  }
}

// ─── Payment Success Handler ─────────────────────────────────────────────────

async function handlePaymentSuccess(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  const razorpayOrderId =
    event.payload.order?.entity?.id ?? payment?.order_id;

  if (!razorpayOrderId) {
    console.error("[Webhook] No order ID in payment success event");
    return;
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
  });

  if (!order) {
    console.error(
      `[Webhook] Order not found for Razorpay order: ${razorpayOrderId}`
    );
    return;
  }

  // ── Duplicate event check ──────────────────────────────────────────────
  const eventKey = `${event.event}:${payment?.id ?? "no-payment-id"}`;
  if (order.payment.webhookEvents.includes(eventKey)) {
    console.log(`[Webhook] Duplicate event skipped: ${eventKey}`);
    return;
  }

  // Record this event
  order.payment.webhookEvents.push(eventKey);

  // ── If order is still pending, mark as paid ────────────────────────────
  if (order.status === "pending") {
    order.payment.razorpayPaymentId =
      payment?.id ?? order.payment.razorpayPaymentId;
    order.payment.method = payment?.method;
    order.payment.bank = payment?.bank;
    order.payment.wallet = payment?.wallet;
    order.payment.vpa = payment?.vpa;
    order.payment.amountPaid = payment?.amount ?? 0;
    order.payment.currency = payment?.currency ?? "INR";
    order.payment.paidAt = new Date();
    order.status = "paid";
    order.statusHistory.push({
      status: "paid",
      timestamp: new Date(),
      note: `Payment confirmed via webhook (${event.event})`,
    });

    await order.save();

    // Deduct inventory
    try {
      await deductInventoryForOrder(order._id.toString());
    } catch (err) {
      console.error(
        `[Webhook] Inventory deduction failed for order ${order.orderNumber}:`,
        err
      );
    }

    // Increment coupon usage
    if (order.coupon?.code) {
      try {
        const coupon = await Coupon.findOne({ code: order.coupon.code });
        if (coupon) {
          const userEntry = coupon.usedBy.find(
            (u) => u.user.toString() === order.user.toString()
          );
          if (userEntry) {
            userEntry.count += 1;
          } else {
            coupon.usedBy.push({ user: order.user, count: 1 });
          }
          coupon.usedCount += 1;
          await coupon.save();
        }
      } catch (err) {
        console.error(
          `[Webhook] Coupon update failed for order ${order.orderNumber}:`,
          err
        );
      }
    }

    // Clear cart
    try {
      await Cart.findOneAndDelete({ user: order.user });
    } catch (err) {
      console.error(
        `[Webhook] Cart clear failed for order ${order.orderNumber}:`,
        err
      );
    }

    console.log(
      `[Webhook] Order ${order.orderNumber} marked as paid via webhook`
    );
  } else {
    // Order was already paid (by verify endpoint) — just update payment details
    if (payment?.id && !order.payment.razorpayPaymentId) {
      order.payment.razorpayPaymentId = payment.id;
    }
    if (payment?.method && !order.payment.method) {
      order.payment.method = payment.method;
      order.payment.bank = payment.bank;
      order.payment.wallet = payment.wallet;
      order.payment.vpa = payment.vpa;
    }
    await order.save();

    console.log(
      `[Webhook] Order ${order.orderNumber} already in "${order.status}" — updated payment details`
    );
  }
}

// ─── Payment Failure Handler ─────────────────────────────────────────────────

async function handlePaymentFailure(event: RazorpayWebhookEvent) {
  const payment = event.payload.payment?.entity;
  const razorpayOrderId = payment?.order_id;

  if (!razorpayOrderId) {
    console.error("[Webhook] No order ID in payment failure event");
    return;
  }

  const order = await Order.findOne({
    "payment.razorpayOrderId": razorpayOrderId,
  });

  if (!order) {
    console.error(
      `[Webhook] Order not found for failed payment: ${razorpayOrderId}`
    );
    return;
  }

  // Duplicate check
  const eventKey = `${event.event}:${payment?.id ?? "no-payment-id"}`;
  if (order.payment.webhookEvents.includes(eventKey)) {
    return;
  }

  order.payment.webhookEvents.push(eventKey);

  // Only log the failure — don't cancel the order because the user can retry
  // payment on the same Razorpay order.
  order.statusHistory.push({
    status: order.status,
    timestamp: new Date(),
    note: `Payment attempt failed: ${payment?.error_description ?? "Unknown error"} (${payment?.error_code ?? "N/A"})`,
  });

  await order.save();

  console.log(
    `[Webhook] Payment failed for order ${order.orderNumber}: ${payment?.error_description}`
  );
}

// ─── Razorpay Webhook Event Types ────────────────────────────────────────────

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        method?: string;
        bank?: string;
        wallet?: string;
        vpa?: string;
        error_code?: string;
        error_description?: string;
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
      };
    };
  };
}
