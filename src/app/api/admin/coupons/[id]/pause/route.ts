import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Coupon, { CouponStatus } from "@/models/coupon.model";
import { resolveCouponStatus } from "@/lib/coupons";

type RouteContext = { params: Promise<{ id: string }> };

function withLifecycle(coupon: Record<string, unknown>) {
  return {
    ...coupon,
    lifecycleStatus: resolveCouponStatus({
      status: (coupon.status as CouponStatus) || "active",
      startsAt: new Date((coupon.startsAt as string | Date) || 0),
      expiresAt: new Date(coupon.expiresAt as string | Date),
      usageLimit: Number(coupon.usageLimit ?? 0),
      usedCount: Number(coupon.usedCount ?? 0),
      deletedAt: (coupon.deletedAt as Date | null) ?? null,
      isActive: coupon.isActive as boolean | undefined,
    }),
  };
}

async function setControlStatus(
  request: NextRequest,
  context: RouteContext,
  status: Extract<CouponStatus, "active" | "paused" | "disabled">
) {
  const auth = await requirePermission(request, "coupons.update");
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!isValidObjectId(id)) {
    return errorResponse("Invalid coupon ID", 400);
  }

  await connectDB();

  const coupon = await Coupon.findOne({ _id: id, deletedAt: null });
  if (!coupon) {
    return errorResponse("Coupon not found", 404);
  }

  if (coupon.status === "draft" && status !== "active") {
    return errorResponse("Publish a draft coupon before pausing or disabling it", 400);
  }

  coupon.status = status;
  coupon.updatedBy = new Types.ObjectId(auth.userId);
  await coupon.save();

  return successResponse(
    withLifecycle(coupon.toJSON() as Record<string, unknown>),
    status === "active"
      ? "Coupon resumed"
      : status === "paused"
        ? "Coupon paused"
        : "Coupon disabled"
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    return await setControlStatus(request, context, "paused");
  } catch (err) {
    console.error("POST /api/admin/coupons/:id/pause error:", err);
    return errorResponse("Failed to pause coupon", 500);
  }
}
