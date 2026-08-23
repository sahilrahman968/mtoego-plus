import { Types } from "mongoose";
import Coupon from "@/models/coupon.model";
import CouponRedemption from "@/models/coupon-redemption.model";
import type { IOrderDocument } from "@/models/order.model";

/**
 * Consume a coupon when an order is paid.
 * Idempotent on order id — safe for verify + webhook dual paths.
 */
export async function redeemCouponForOrder(
  order: Pick<
    IOrderDocument,
    "_id" | "user" | "orderNumber" | "coupon" | "pricing"
  >
): Promise<{ redeemed: boolean; alreadyRedeemed: boolean }> {
  if (!order.coupon?.code) {
    return { redeemed: false, alreadyRedeemed: false };
  }

  const existing = await CouponRedemption.findOne({ order: order._id });
  if (existing) {
    return { redeemed: false, alreadyRedeemed: true };
  }

  const coupon = await Coupon.findOne({
    code: order.coupon.code,
    deletedAt: null,
  });
  if (!coupon) {
    return { redeemed: false, alreadyRedeemed: false };
  }

  // Atomic global usage increment (0 = unlimited)
  const filter: Record<string, unknown> = { _id: coupon._id };
  if (coupon.usageLimit > 0) {
    filter.usedCount = { $lt: coupon.usageLimit };
  }

  const updated = await Coupon.findOneAndUpdate(
    filter,
    {
      $inc: { usedCount: 1 },
    },
    { new: true }
  );

  if (!updated) {
    console.error(
      `[Coupon] Global usage limit race for ${coupon.code} on order ${order.orderNumber}`
    );
    return { redeemed: false, alreadyRedeemed: false };
  }

  // Maintain legacy usedBy counters
  const userId = order.user;
  const userEntry = updated.usedBy.find(
    (u) => u.user.toString() === userId.toString()
  );
  if (userEntry) {
    await Coupon.updateOne(
      { _id: coupon._id, "usedBy.user": userId },
      { $inc: { "usedBy.$.count": 1 } }
    );
  } else {
    await Coupon.updateOne(
      { _id: coupon._id },
      { $push: { usedBy: { user: userId, count: 1 } } }
    );
  }

  try {
    await CouponRedemption.create({
      coupon: coupon._id,
      code: coupon.code,
      user: userId,
      order: order._id,
      orderNumber: order.orderNumber,
      discountAmount: order.coupon.discountAmount ?? order.pricing?.discount ?? 0,
      snapshot: {
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderValue: coupon.minOrderValue,
      },
      status: "redeemed",
    });
  } catch (err) {
    // Unique order index — another path already redeemed
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      return { redeemed: false, alreadyRedeemed: true };
    }
    throw err;
  }

  return { redeemed: true, alreadyRedeemed: false };
}

/**
 * Restore coupon usage when an order is cancelled (policy-aware).
 */
export async function restoreCouponForOrder(
  order: Pick<IOrderDocument, "_id" | "user" | "orderNumber" | "coupon">
): Promise<{ restored: boolean }> {
  if (!order.coupon?.code) {
    return { restored: false };
  }

  const redemption = await CouponRedemption.findOne({
    order: order._id,
    status: "redeemed",
  });
  if (!redemption) {
    return { restored: false };
  }

  const coupon = await Coupon.findById(redemption.coupon);
  if (!coupon) {
    return { restored: false };
  }

  if (!coupon.restoreOnCancel) {
    return { restored: false };
  }

  redemption.status = "restored";
  redemption.restoredAt = new Date();
  await redemption.save();

  await Coupon.updateOne(
    { _id: coupon._id, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  );

  const userId =
    order.user instanceof Types.ObjectId
      ? order.user
      : new Types.ObjectId(String(order.user));

  await Coupon.updateOne(
    { _id: coupon._id, "usedBy.user": userId, "usedBy.count": { $gt: 0 } },
    { $inc: { "usedBy.$.count": -1 } }
  );

  return { restored: true };
}
