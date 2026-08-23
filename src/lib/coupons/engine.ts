import { Types } from "mongoose";
import Coupon, { ICouponDocument } from "@/models/coupon.model";
import CouponRedemption from "@/models/coupon-redemption.model";
import Order from "@/models/order.model";
import { calculateDiscount } from "@/lib/pricing";
import { isCouponLineEligible } from "@/lib/coupons/eligibility";
import { resolveCouponStatus } from "@/lib/coupons/status";
import {
  CouponFailureReason,
  couponFailureMessage,
} from "@/lib/coupons/reasons";

export interface CouponCartLine {
  productId: string;
  categoryId?: string | null;
  price: number;
  quantity: number;
  allowCoupons?: boolean;
}

export interface CouponValidationContext {
  userId: string;
  lines: CouponCartLine[];
  /** Skip DB first-order lookup when caller already knows */
  isFirstOrder?: boolean;
}

export interface CouponDiscountResult {
  type: "percentage" | "flat";
  value: number;
  maxDiscount: number | null;
  amount: number;
}

export interface CouponValidationSuccess {
  valid: true;
  coupon: ICouponDocument;
  discount: CouponDiscountResult;
  eligibleSubtotal: number;
  cartSubtotal: number;
  message: string;
  eligibleProductIds: string[];
}

export interface CouponValidationFailure {
  valid: false;
  reason: CouponFailureReason;
  message: string;
  meta?: {
    shortfall?: number;
    minOrderValue?: number;
    eligibleSubtotal?: number;
  };
}

export type CouponValidationResult =
  | CouponValidationSuccess
  | CouponValidationFailure;

function fail(
  reason: CouponFailureReason,
  detail?: string,
  meta?: CouponValidationFailure["meta"]
): CouponValidationFailure {
  return {
    valid: false,
    reason,
    message: couponFailureMessage(reason, detail),
    meta,
  };
}

function lineTotal(line: CouponCartLine): number {
  return line.price * line.quantity;
}

/**
 * Count completed orders that count toward "first order" eligibility.
 */
export async function countPriorOrders(userId: string): Promise<number> {
  return Order.countDocuments({
    user: new Types.ObjectId(userId),
    status: { $in: ["paid", "processing", "shipped", "delivered"] },
  });
}

export async function countUserRedemptions(
  couponId: Types.ObjectId | string,
  userId: string
): Promise<number> {
  const fromRedemptions = await CouponRedemption.countDocuments({
    coupon: couponId,
    user: userId,
    status: "redeemed",
  });
  if (fromRedemptions > 0) return fromRedemptions;

  // Fallback for legacy usedBy data before redemption records existed
  const coupon = await Coupon.findById(couponId).select("usedBy").lean();
  if (!coupon) return 0;
  const entry = coupon.usedBy?.find((u) => u.user.toString() === userId);
  return entry?.count ?? 0;
}

/**
 * Core coupon validation engine.
 * Evaluates lifecycle → customer → usage → cart → products → discount.
 */
export async function validateCouponForCart(
  codeOrCoupon: string | ICouponDocument,
  ctx: CouponValidationContext,
  now: Date = new Date()
): Promise<CouponValidationResult> {
  if (!ctx.lines.length) {
    return fail("CART_EMPTY");
  }

  let coupon: ICouponDocument | null =
    typeof codeOrCoupon === "string"
      ? await Coupon.findOne({
          code: codeOrCoupon.trim().toUpperCase(),
          deletedAt: null,
        })
      : codeOrCoupon;

  if (!coupon || coupon.deletedAt) {
    return fail("INVALID_COUPON");
  }

  const lifecycle = resolveCouponStatus(coupon, now);
  switch (lifecycle) {
    case "draft":
      return fail("DRAFT");
    case "disabled":
      return fail("DISABLED");
    case "paused":
      return fail("PAUSED");
    case "scheduled":
      return fail(
        "NOT_STARTED",
        `This coupon is valid from ${new Date(coupon.startsAt).toLocaleString("en-IN")}`
      );
    case "expired":
      return fail("EXPIRED");
    case "exhausted":
      return fail("EXHAUSTED");
    case "active":
      break;
  }

  if (ctx.lines.some((line) => line.allowCoupons === false)) {
    return fail("SALE_BLOCKS_COUPONS");
  }

  // ── Customer eligibility ───────────────────────────────────────────────
  let isFirstOrder = ctx.isFirstOrder;
  if (coupon.firstOrderOnly) {
    if (isFirstOrder === undefined) {
      const prior = await countPriorOrders(ctx.userId);
      isFirstOrder = prior === 0;
    }
    if (!isFirstOrder) {
      return fail("FIRST_ORDER_ONLY");
    }
  }

  // ── Usage limits ───────────────────────────────────────────────────────
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return fail("USAGE_LIMIT_REACHED");
  }

  if (coupon.perUserLimit > 0) {
    const userUses = await countUserRedemptions(coupon._id, ctx.userId);
    if (userUses >= coupon.perUserLimit) {
      return fail("CUSTOMER_LIMIT_REACHED");
    }
  }

  // ── Product / category eligibility ─────────────────────────────────────
  const targeting =
    (coupon.applicableProducts?.length ?? 0) > 0 ||
    (coupon.applicableCategories?.length ?? 0) > 0;

  const eligibleLines = ctx.lines.filter((line) =>
    isCouponLineEligible({
      productId: line.productId,
      categoryId: line.categoryId,
      applicableProducts: coupon!.applicableProducts,
      applicableCategories: coupon!.applicableCategories,
      excludedProducts: coupon!.excludedProducts,
    })
  );

  if (targeting && eligibleLines.length === 0) {
    const hasCategories = (coupon.applicableCategories?.length ?? 0) > 0;
    return fail(hasCategories ? "CATEGORY_NOT_ELIGIBLE" : "PRODUCT_NOT_ELIGIBLE");
  }

  const cartSubtotal = round(
    ctx.lines.reduce((sum, line) => sum + lineTotal(line), 0)
  );
  const eligibleSubtotal = round(
    eligibleLines.reduce((sum, line) => sum + lineTotal(line), 0)
  );

  const minOrderBase = targeting ? eligibleSubtotal : cartSubtotal;
  if (minOrderBase < coupon.minOrderValue) {
    const shortfall = round(coupon.minOrderValue - minOrderBase);
    return fail(
      "MINIMUM_CART_VALUE",
      targeting
        ? `Add ₹${shortfall.toFixed(0)} more in eligible products to use this coupon`
        : `Add ₹${shortfall.toFixed(0)} more to use this coupon`,
      {
        shortfall,
        minOrderValue: coupon.minOrderValue,
        eligibleSubtotal: minOrderBase,
      }
    );
  }

  const amount = calculateDiscount(eligibleSubtotal, {
    type: coupon.type,
    value: coupon.value,
    maxDiscount: coupon.maxDiscount,
  });

  const message =
    coupon.type === "percentage"
      ? `${coupon.value}% discount applied${
          coupon.maxDiscount != null ? ` (max ₹${coupon.maxDiscount})` : ""
        }`
      : `₹${coupon.value} discount applied`;

  return {
    valid: true,
    coupon,
    discount: {
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      amount,
    },
    eligibleSubtotal,
    cartSubtotal,
    message: coupon.customerDescription || message,
    eligibleProductIds: eligibleLines.map((l) => l.productId),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
