import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Cart from "@/models/cart.model";
import Product from "@/models/product.model";
import { validateCouponForCart, type CouponCartLine } from "@/lib/coupons";

// ─── POST /api/user/cart/apply-coupon — Validate + attach coupon (no redeem) ─

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code) {
      return errorResponse("Coupon code is required", 400, "INVALID_COUPON");
    }

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart || cart.items.length === 0) {
      return errorResponse("Cart is empty", 400, "CART_EMPTY");
    }

    const { loadLiveSaleIndex, resolveUnitPrice } = await import("@/lib/sales");
    const saleIndex = await loadLiveSaleIndex();
    const lines: CouponCartLine[] = [];

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive) continue;
      const variant = product.variants.find(
        (v) => v._id.toString() === item.variant.toString() && v.isActive
      );
      if (!variant) continue;
      const priced = resolveUnitPrice(
        saleIndex,
        product._id.toString(),
        variant.price
      );
      lines.push({
        productId: product._id.toString(),
        categoryId: product.category?.toString() || null,
        price: priced.price,
        quantity: item.quantity,
        allowCoupons: priced.offer ? priced.offer.campaign.allowCoupons : true,
      });
    }

    const result = await validateCouponForCart(code, {
      userId: auth.userId,
      lines,
    });

    if (!result.valid) {
      return errorResponse(result.message, 400, result.reason, {
        reason: result.reason,
        meta: result.meta,
      });
    }

    // Apply only — usage is consumed at payment success (redeem)
    cart.coupon = result.coupon._id;
    await cart.save();

    return successResponse(
      {
        valid: true,
        code: result.coupon.code,
        name: result.coupon.name,
        type: result.coupon.type,
        value: result.coupon.value,
        maxDiscount: result.coupon.maxDiscount,
        description: result.coupon.description,
        customerDescription: result.coupon.customerDescription,
        discount: result.discount,
        message: result.message,
        applicableProducts: (result.coupon.applicableProducts || []).map((id) =>
          id.toString()
        ),
        applicableCategories: (result.coupon.applicableCategories || []).map((id) =>
          id.toString()
        ),
        firstOrderOnly: result.coupon.firstOrderOnly,
      },
      result.message
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
