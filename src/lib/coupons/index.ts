export {
  validateCouponForCart,
  countPriorOrders,
  countUserRedemptions,
  type CouponCartLine,
  type CouponValidationContext,
  type CouponValidationResult,
  type CouponDiscountResult,
} from "@/lib/coupons/engine";

export {
  redeemCouponForOrder,
  restoreCouponForOrder,
} from "@/lib/coupons/redeem";

export {
  resolveCouponStatus,
  isCouponRedeemable,
  COUPON_CONTROL_STATUSES,
} from "@/lib/coupons/status";

export {
  isCouponLineEligible,
  isCouponProductEligible,
} from "@/lib/coupons/eligibility";

export {
  COUPON_FAILURE_REASONS,
  COUPON_FAILURE_MESSAGES,
  couponFailureMessage,
  type CouponFailureReason,
} from "@/lib/coupons/reasons";
