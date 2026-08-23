/**
 * Machine-readable coupon validation failure reasons.
 * Used by the promotion engine and storefront UX.
 */

export const COUPON_FAILURE_REASONS = [
  "INVALID_COUPON",
  "EXPIRED",
  "NOT_STARTED",
  "DISABLED",
  "DRAFT",
  "PAUSED",
  "EXHAUSTED",
  "USAGE_LIMIT_REACHED",
  "CUSTOMER_LIMIT_REACHED",
  "MINIMUM_CART_VALUE",
  "PRODUCT_NOT_ELIGIBLE",
  "CATEGORY_NOT_ELIGIBLE",
  "CUSTOMER_NOT_ELIGIBLE",
  "FIRST_ORDER_ONLY",
  "SALE_BLOCKS_COUPONS",
  "CART_EMPTY",
] as const;

export type CouponFailureReason = (typeof COUPON_FAILURE_REASONS)[number];

export const COUPON_FAILURE_MESSAGES: Record<CouponFailureReason, string> = {
  INVALID_COUPON: "Invalid coupon code",
  EXPIRED: "This coupon has expired",
  NOT_STARTED: "This coupon is not active yet",
  DISABLED: "This coupon is no longer available",
  DRAFT: "This coupon is not available",
  PAUSED: "This coupon is temporarily unavailable",
  EXHAUSTED: "This coupon has reached its usage limit",
  USAGE_LIMIT_REACHED: "This coupon has reached its usage limit",
  CUSTOMER_LIMIT_REACHED: "You have already used this coupon the maximum number of times",
  MINIMUM_CART_VALUE: "Cart does not meet the minimum order value for this coupon",
  PRODUCT_NOT_ELIGIBLE: "This coupon does not apply to products in your cart",
  CATEGORY_NOT_ELIGIBLE: "This coupon does not apply to categories in your cart",
  CUSTOMER_NOT_ELIGIBLE: "You are not eligible for this coupon",
  FIRST_ORDER_ONLY: "This coupon is only valid on your first order",
  SALE_BLOCKS_COUPONS: "This sale cannot be combined with a coupon",
  CART_EMPTY: "Cart is empty",
};

export function couponFailureMessage(
  reason: CouponFailureReason,
  detail?: string
): string {
  return detail || COUPON_FAILURE_MESSAGES[reason];
}
