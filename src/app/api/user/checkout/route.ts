import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateCheckout } from "@/lib/validators";
import { getRazorpayInstance } from "@/lib/razorpay";
import { buildCartSummary } from "@/lib/pricing";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";
import Product, { IProductDocument } from "@/models/product.model";
import Order, { generateOrderNumber } from "@/models/order.model";

// ─── POST /api/user/checkout ─────────────────────────────────────────────────
// 1. Validate cart (stock, prices, coupon)
// 2. Create local Order in "pending" status
// 3. Create Razorpay order
// 4. Return Razorpay order details to the frontend for Checkout.js
//
// Inventory is NOT deducted here — only after payment is confirmed.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateCheckout(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const { idempotencyKey, shippingAddress, isInterState, notes } = body;

    await connectDB();

    // ── Idempotency check — prevent duplicate orders from same checkout ──
    const existingOrder = await Order.findOne({ idempotencyKey });
    if (existingOrder) {
      // Return existing Razorpay order info so the client can retry payment
      return successResponse(
        {
          orderId: existingOrder._id,
          orderNumber: existingOrder.orderNumber,
          razorpayOrderId: existingOrder.payment.razorpayOrderId,
          amount: existingOrder.pricing.grandTotal,
          currency: existingOrder.payment.currency,
          status: existingOrder.status,
        },
        "Order already exists for this checkout"
      );
    }

    // ── Load and validate cart ───────────────────────────────────────────
    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart || cart.items.length === 0) {
      return errorResponse("Cart is empty", 400);
    }

    const validLineItems: {
      product: IProductDocument;
      variantId: string;
      price: number;
      quantity: number;
      title: string;
      variantLabel: string;
      sku: string;
    }[] = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) {
        return errorResponse(
          `Product "${item.product}" is no longer available. Please update your cart.`,
          400
        );
      }

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variant.toString() && v.isActive
      );
      if (!variant) {
        return errorResponse(
          `Variant for "${product.title}" is no longer available. Please update your cart.`,
          400
        );
      }

      if (variant.stock < item.quantity) {
        return errorResponse(
          `Insufficient stock for "${product.title}" (${variant.sku}). ` +
            `Available: ${variant.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      const label = [variant.color, variant.size].filter(Boolean).join(" / ") || "Default";

      validLineItems.push({
        product,
        variantId: variant._id.toString(),
        price: variant.price,
        quantity: item.quantity,
        title: product.title,
        variantLabel: label,
        sku: variant.sku,
      });
    }

    // ── Calculate pricing ────────────────────────────────────────────────
    let couponData: {
      type: "percentage" | "flat";
      value: number;
      maxDiscount: number | null;
      code: string;
    } | null = null;

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (
        coupon &&
        coupon.isActive &&
        coupon.expiresAt > new Date() &&
        coupon.usedCount < coupon.usageLimit
      ) {
        const userUsage = coupon.usedBy.find(
          (u) => u.user.toString() === auth.userId
        );
        const withinLimit =
          coupon.perUserLimit === 0 ||
          !userUsage ||
          userUsage.count < coupon.perUserLimit;

        if (withinLimit) {
          couponData = {
            type: coupon.type as "percentage" | "flat",
            value: coupon.value,
            maxDiscount: coupon.maxDiscount,
            code: coupon.code,
          };
        }
      }
    }

    const lineItems = validLineItems.map((li) => ({
      price: li.price,
      quantity: li.quantity,
    }));

    const summary = buildCartSummary(
      lineItems,
      couponData
        ? { type: couponData.type, value: couponData.value, maxDiscount: couponData.maxDiscount }
        : null,
      { isInterState: isInterState === true }
    );

    if (summary.grandTotal <= 0) {
      return errorResponse("Order total must be greater than zero", 400);
    }

    // ── Create Razorpay Order ────────────────────────────────────────────
    // Razorpay expects amount in paise (smallest currency unit)
    const amountInPaise = Math.round(summary.grandTotal * 100);

    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      notes: {
        userId: auth.userId,
        idempotencyKey,
      },
    });

    // ── Create local Order ───────────────────────────────────────────────
    const orderNumber = await generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: auth.userId,
      items: validLineItems.map((li) => ({
        product: li.product._id,
        variant: li.variantId,
        title: li.title,
        variantLabel: li.variantLabel,
        sku: li.sku,
        price: li.price,
        quantity: li.quantity,
        total: li.price * li.quantity,
      })),
      shippingAddress: {
        name: shippingAddress.name.trim(),
        phone: shippingAddress.phone.trim(),
        line1: shippingAddress.line1.trim(),
        line2: shippingAddress.line2?.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pincode: shippingAddress.pincode.trim(),
        country: shippingAddress.country?.trim() || "IN",
      },
      pricing: {
        subtotal: summary.subtotal,
        discount: summary.discount,
        subtotalAfterDiscount: summary.subtotalAfterDiscount,
        cgst: summary.gst.cgst,
        sgst: summary.gst.sgst,
        igst: summary.gst.igst,
        totalTax: summary.gst.totalTax,
        shippingCost: summary.shipping.cost,
        grandTotal: summary.grandTotal,
      },
      payment: {
        razorpayOrderId: razorpayOrder.id,
        amountPaid: 0,
        currency: "INR",
        webhookEvents: [],
      },
      coupon: couponData
        ? {
            code: couponData.code,
            type: couponData.type,
            value: couponData.value,
            discountAmount: summary.discount,
          }
        : undefined,
      status: "pending",
      statusHistory: [{ status: "pending", timestamp: new Date() }],
      idempotencyKey,
      inventoryDeducted: false,
      notes: notes?.trim(),
    });

    // ── Return Razorpay order details for frontend Checkout.js ───────────
    return successResponse(
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        razorpayOrderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID, // Public key for frontend
        summary,
      },
      "Checkout initiated — complete payment to confirm order",
      201
    );
  } catch (err) {
    console.error("POST /api/user/checkout error:", err);
    return errorResponse("Failed to initiate checkout", 500);
  }
}
