import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId, validateUpdateCoupon } from "@/lib/validators";
import Coupon from "@/models/coupon.model";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/admin/coupons/:id — Get single coupon ─────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid coupon ID", 400);
    }

    await connectDB();

    const coupon = await Coupon.findById(id).lean();
    if (!coupon) {
      return errorResponse("Coupon not found", 404);
    }

    return successResponse(coupon, "Coupon retrieved");
  } catch (err) {
    console.error("GET /api/admin/coupons/:id error:", err);
    return errorResponse("Failed to retrieve coupon", 500);
  }
}

// ─── PUT /api/admin/coupons/:id — Update coupon ─────────────────────────────

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid coupon ID", 400);
    }

    const body = await request.json();
    const validation = validateUpdateCoupon(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    await connectDB();

    const coupon = await Coupon.findById(id);
    if (!coupon) {
      return errorResponse("Coupon not found", 404);
    }

    // Build update object
    const updates: Record<string, unknown> = {};

    if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.value !== undefined) updates.value = body.value;
    if (body.minOrderValue !== undefined) updates.minOrderValue = body.minOrderValue;
    if (body.maxDiscount !== undefined) updates.maxDiscount = body.maxDiscount;
    if (body.expiresAt !== undefined) updates.expiresAt = new Date(body.expiresAt);
    if (body.usageLimit !== undefined) updates.usageLimit = body.usageLimit;
    if (body.perUserLimit !== undefined) updates.perUserLimit = body.perUserLimit;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    // Check code uniqueness if changing
    if (updates.code && updates.code !== coupon.code) {
      const existing = await Coupon.findOne({
        code: updates.code,
        _id: { $ne: id },
      });
      if (existing) {
        return errorResponse("A coupon with this code already exists", 409);
      }
    }

    Object.assign(coupon, updates);
    await coupon.save();

    return successResponse(coupon.toJSON(), "Coupon updated");
  } catch (err) {
    console.error("PUT /api/admin/coupons/:id error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A coupon with this code already exists", 409);
    }
    return errorResponse("Failed to update coupon", 500);
  }
}

// ─── DELETE /api/admin/coupons/:id — Delete coupon ───────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid coupon ID", 400);
    }

    await connectDB();

    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      return errorResponse("Coupon not found", 404);
    }

    return successResponse(null, "Coupon deleted");
  } catch (err) {
    console.error("DELETE /api/admin/coupons/:id error:", err);
    return errorResponse("Failed to delete coupon", 500);
  }
}
