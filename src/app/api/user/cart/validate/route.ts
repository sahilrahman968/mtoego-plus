import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";
import Product, { IProductDocument } from "@/models/product.model";
import { buildCartSummary } from "@/lib/pricing";
import { CartValidationResult } from "@/types";

// ─── POST /api/user/cart/validate — Secure cart validation before checkout ───
// Verifies every item for stock, active status, price consistency, and coupon
// validity. Returns a full pricing summary if valid.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    // Optional body for shipping context
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is fine
    }

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart || cart.items.length === 0) {
      return successResponse<CartValidationResult>(
        { valid: false, errors: ["Cart is empty"], warnings: [], summary: null },
        "Cart validation failed",
        400
      );
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const validLineItems: { price: number; quantity: number }[] = [];
    const itemsToRemove: number[] = [];

    // ── Validate each item ───────────────────────────────────────────────
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const product: IProductDocument | null = await Product.findById(item.product);

      if (!product || !product.isActive) {
        errors.push(`Item ${i + 1}: Product no longer available`);
        itemsToRemove.push(i);
        continue;
      }

      const variant = product.variants.find(
        (v) => v._id.toString() === item.variant.toString()
      );

      if (!variant || !variant.isActive) {
        errors.push(`Item ${i + 1} (${product.title}): Variant no longer available`);
        itemsToRemove.push(i);
        continue;
      }

      // Stock check
      if (variant.stock < item.quantity) {
        if (variant.stock === 0) {
          errors.push(`${product.title}: Out of stock`);
          itemsToRemove.push(i);
        } else {
          errors.push(
            `${product.title}: Only ${variant.stock} unit(s) available (you have ${item.quantity})`
          );
        }
        continue;
      }

      // Price drift warning
      if (item.priceAtAdd !== variant.price) {
        warnings.push(
          `${product.title}: Price changed from ₹${item.priceAtAdd} to ₹${variant.price}`
        );
        // Update the snapshot
        cart.items[i].priceAtAdd = variant.price;
      }

      validLineItems.push({ price: variant.price, quantity: item.quantity });
    }

    // ── Clean up invalid items ───────────────────────────────────────────
    if (itemsToRemove.length > 0) {
      // Remove in reverse order to keep indexes stable
      for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        cart.items.splice(itemsToRemove[i], 1);
      }
      await cart.save();
    } else if (warnings.length > 0) {
      // Save updated price snapshots
      await cart.save();
    }

    // ── If there are hard errors, fail ───────────────────────────────────
    if (errors.length > 0) {
      return successResponse<CartValidationResult>(
        { valid: false, errors, warnings, summary: null },
        "Cart validation failed",
        400
      );
    }

    // ── Validate coupon if applied ───────────────────────────────────────
    let couponData: {
      type: "percentage" | "flat";
      value: number;
      maxDiscount: number | null;
    } | null = null;

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);

      if (!coupon || !coupon.isActive) {
        warnings.push("Applied coupon is no longer valid — removed");
        cart.coupon = null;
        await cart.save();
      } else if (coupon.expiresAt < new Date()) {
        warnings.push("Applied coupon has expired — removed");
        cart.coupon = null;
        await cart.save();
      } else if (coupon.usedCount >= coupon.usageLimit) {
        warnings.push("Applied coupon has reached its usage limit — removed");
        cart.coupon = null;
        await cart.save();
      } else {
        // Check per-user limit
        const userUsage = coupon.usedBy.find(
          (u) => u.user.toString() === auth.userId
        );
        if (coupon.perUserLimit > 0 && userUsage && userUsage.count >= coupon.perUserLimit) {
          warnings.push("You have already used this coupon the maximum number of times — removed");
          cart.coupon = null;
          await cart.save();
        } else {
          // Check min order value
          const rawSubtotal = validLineItems.reduce(
            (sum, li) => sum + li.price * li.quantity,
            0
          );
          if (rawSubtotal < coupon.minOrderValue) {
            warnings.push(
              `Cart subtotal ₹${rawSubtotal.toFixed(2)} is below coupon minimum of ₹${coupon.minOrderValue} — coupon removed`
            );
            cart.coupon = null;
            await cart.save();
          } else {
            couponData = {
              type: coupon.type as "percentage" | "flat",
              value: coupon.value,
              maxDiscount: coupon.maxDiscount,
            };
          }
        }
      }
    }

    // ── Build summary ────────────────────────────────────────────────────
    const summary = buildCartSummary(validLineItems, couponData, {
      isInterState: body.isInterState === true,
      pincode: typeof body.pincode === "string" ? body.pincode : undefined,
    });

    return successResponse<CartValidationResult>(
      {
        valid: true,
        errors: [],
        warnings,
        summary: {
          ...summary,
          gst: summary.gst,
          shipping: summary.shipping,
        },
      },
      "Cart is valid and ready for checkout"
    );
  } catch (err) {
    console.error("POST /api/user/cart/validate error:", err);
    return errorResponse("Failed to validate cart", 500);
  }
}
