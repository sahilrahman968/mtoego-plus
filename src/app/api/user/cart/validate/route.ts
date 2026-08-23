import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import Cart from "@/models/cart.model";
import Coupon from "@/models/coupon.model";
import Product, { IProductDocument } from "@/models/product.model";
import { buildCartSummary } from "@/lib/pricing";
import { isCouponLineEligible, validateCouponForCart } from "@/lib/coupons";
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
    const validLineItems: {
      price: number;
      quantity: number;
      gst: number;
      allowCoupons: boolean;
      productId: string;
      categoryId: string | null;
    }[] = [];
    const itemsToRemove: number[] = [];
    const { loadLiveSaleIndex, resolveUnitPrice } = await import("@/lib/sales");
    const saleIndex = await loadLiveSaleIndex();

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

      const priced = resolveUnitPrice(
        saleIndex,
        product._id.toString(),
        variant.price
      );
      if (item.priceAtAdd !== priced.price) {
        warnings.push(
          `${product.title}: Price changed from ₹${item.priceAtAdd} to ₹${priced.price}`
        );
        cart.items[i].priceAtAdd = priced.price;
      }

      validLineItems.push({
        price: priced.price,
        quantity: item.quantity,
        gst: typeof variant.gst === "number" ? variant.gst : 18,
        allowCoupons: priced.offer ? priced.offer.campaign.allowCoupons : true,
        productId: product._id.toString(),
        categoryId: product.category?.toString() || null,
      });
    }

    if (itemsToRemove.length > 0) {
      for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        cart.items.splice(itemsToRemove[i], 1);
      }
      await cart.save();
    } else if (warnings.length > 0) {
      await cart.save();
    }

    if (errors.length > 0) {
      return successResponse<CartValidationResult>(
        { valid: false, errors, warnings, summary: null },
        "Cart validation failed",
        400
      );
    }

    let couponData: {
      type: "percentage" | "flat";
      value: number;
      maxDiscount: number | null;
    } | null = null;
    let eligibleChecker: ((productId: string, categoryId: string | null) => boolean) | null =
      null;

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);
      if (!coupon || coupon.deletedAt) {
        warnings.push("Applied coupon is no longer valid — removed");
        cart.coupon = null;
        await cart.save();
      } else {
        const result = await validateCouponForCart(coupon, {
          userId: auth.userId,
          lines: validLineItems.map((li) => ({
            productId: li.productId,
            categoryId: li.categoryId,
            price: li.price,
            quantity: li.quantity,
            allowCoupons: li.allowCoupons,
          })),
        });

        if (!result.valid) {
          warnings.push(`${result.message} — coupon removed`);
          cart.coupon = null;
          await cart.save();
        } else {
          couponData = {
            type: result.discount.type,
            value: result.discount.value,
            maxDiscount: result.discount.maxDiscount,
          };
          eligibleChecker = (productId, categoryId) =>
            isCouponLineEligible({
              productId,
              categoryId,
              applicableProducts: coupon.applicableProducts,
              applicableCategories: coupon.applicableCategories,
              excludedProducts: coupon.excludedProducts,
            });
        }
      }
    }

    const summary = buildCartSummary(
      validLineItems.map((li) => ({
        price: li.price,
        quantity: li.quantity,
        gst: li.gst,
        couponEligible: eligibleChecker
          ? eligibleChecker(li.productId, li.categoryId)
          : true,
      })),
      couponData,
      {
        isInterState: body.isInterState === true,
        pincode: typeof body.pincode === "string" ? body.pincode : undefined,
      }
    );

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
