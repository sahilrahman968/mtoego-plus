import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";
import Product from "@/models/product.model";

// ─── POST /api/user/cart/apply-coupon — Apply a coupon to the cart ───────────

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code) {
      return errorResponse("Coupon code is required", 400);
    }

    await connectDB();

    // ── Find cart ────────────────────────────────────────────────────────
    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart || cart.items.length === 0) {
      return errorResponse("Cart is empty", 400);
    }

    // ── Find coupon ──────────────────────────────────────────────────────
    const coupon = await Coupon.findOne({ code, isActive: true });
    if (!coupon) {
      return errorResponse("Invalid or inactive coupon code", 404);
    }

    // ── Check expiry ─────────────────────────────────────────────────────
    if (coupon.expiresAt < new Date()) {
      return errorResponse("This coupon has expired", 400);
    }

    // ── Check global usage limit ─────────────────────────────────────────
    if (coupon.usedCount >= coupon.usageLimit) {
      return errorResponse("This coupon has reached its usage limit", 400);
    }

    // ── Check per-user usage limit ───────────────────────────────────────
    if (coupon.perUserLimit > 0) {
      const userUsage = coupon.usedBy.find(
        (u) => u.user.toString() === auth.userId
      );
      if (userUsage && userUsage.count >= coupon.perUserLimit) {
        return errorResponse("You have already used this coupon the maximum number of times", 400);
      }
    }

    // ── Check minimum order value ────────────────────────────────────────
    // Calculate current cart subtotal
    let subtotal = 0;
    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (product && product.isActive) {
        const variant = product.variants.find(
          (v) => v._id.toString() === item.variant.toString() && v.isActive
        );
        if (variant) {
          subtotal += variant.price * item.quantity;
        }
      }
    }

    if (subtotal < coupon.minOrderValue) {
      return errorResponse(
        `Minimum order value of ₹${coupon.minOrderValue} required. Current subtotal: ₹${subtotal.toFixed(2)}`,
        400
      );
    }

    // ── Apply coupon to cart ─────────────────────────────────────────────
    cart.coupon = coupon._id;
    await cart.save();

    return successResponse(
      {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        description: coupon.description,
      },
      "Coupon applied successfully"
    );
  } catch (err) {
    console.error("POST /api/user/cart/apply-coupon error:", err);
    return errorResponse("Failed to apply coupon", 500);
  }
}

// ─── DELETE /api/user/cart/apply-coupon — Remove coupon from cart ─────────────

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      return errorResponse("Cart not found", 404);
    }

    cart.coupon = null;
    await cart.save();

    return successResponse(null, "Coupon removed from cart");
  } catch (err) {
    console.error("DELETE /api/user/cart/apply-coupon error:", err);
    return errorResponse("Failed to remove coupon", 500);
  }
}
