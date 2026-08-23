import type { CouponLifecycleStatus, CouponStatus } from "@/models/coupon.model";

/**
 * Admin-controlled lifecycle values stored on the document.
 * Derived values (scheduled / expired / exhausted / active) are computed at read time.
 */
export const COUPON_CONTROL_STATUSES = [
  "draft",
  "active",
  "paused",
  "disabled",
] as const;

export type CouponControlStatus = (typeof COUPON_CONTROL_STATUSES)[number];

export interface CouponStatusSource {
  status: CouponStatus;
  startsAt: Date;
  expiresAt: Date;
  usageLimit: number;
  usedCount: number;
  deletedAt?: Date | null;
  isActive?: boolean;
}

/**
 * Resolve the effective public/admin status from stored fields + clock.
 */
export function resolveCouponStatus(
  coupon: CouponStatusSource,
  now: Date = new Date()
): CouponLifecycleStatus {
  if (coupon.deletedAt) return "disabled";

  const control = coupon.status || (coupon.isActive === false ? "disabled" : "active");

  if (control === "draft") return "draft";
  if (control === "disabled") return "disabled";
  if (control === "paused") return "paused";

  if (coupon.startsAt && now < new Date(coupon.startsAt)) return "scheduled";
  if (coupon.expiresAt && now >= new Date(coupon.expiresAt)) return "expired";
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return "exhausted";
  }

  return "active";
}

export function isCouponRedeemable(
  coupon: CouponStatusSource,
  now: Date = new Date()
): boolean {
  return resolveCouponStatus(coupon, now) === "active";
}
