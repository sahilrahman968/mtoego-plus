import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId, validateUpdateCoupon } from "@/lib/validators";
import Coupon, { CouponStatus } from "@/models/coupon.model";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import { resolveCouponStatus } from "@/lib/coupons";

type RouteContext = { params: Promise<{ id: string }> };

function withLifecycle<T extends Record<string, unknown>>(coupon: T) {
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

function filterObjectIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (id: unknown): id is string => typeof id === "string" && isValidObjectId(id)
      )
    : [];
}

// ─── GET /api/admin/coupons/:id — Get single coupon ─────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(request, "coupons.view");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid coupon ID", 400);
    }

    await connectDB();

    const coupon = await Coupon.findOne({ _id: id, deletedAt: null })
      .populate({
        path: "applicableProducts",
        select: "title slug images variants isActive",
      })
      .populate({
        path: "excludedProducts",
        select: "title slug images isActive",
      })
      .populate({
        path: "applicableCategories",
        select: "name slug isActive",
      })
      .lean();
    if (!coupon) {
      return errorResponse("Coupon not found", 404);
    }

    return successResponse(
      withLifecycle(coupon as Record<string, unknown>),
      "Coupon retrieved"
    );
  } catch (err) {
    console.error("GET /api/admin/coupons/:id error:", err);
    return errorResponse("Failed to retrieve coupon", 500);
  }
}

// ─── PUT /api/admin/coupons/:id — Update coupon ─────────────────────────────

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(request, "coupons.update");
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

    const coupon = await Coupon.findOne({ _id: id, deletedAt: null });
    if (!coupon) {
      return errorResponse("Coupon not found", 404);
    }

    const updates: Record<string, unknown> = {
      updatedBy: new Types.ObjectId(auth.userId),
    };

    if (body.code !== undefined) updates.code = body.code.trim().toUpperCase();
    if (body.name !== undefined) updates.name = body.name.trim() || coupon.code;
    if (body.description !== undefined) updates.description = body.description;
    if (body.customerDescription !== undefined) {
      updates.customerDescription = body.customerDescription;
    }
    if (body.type !== undefined) updates.type = body.type;
    if (body.value !== undefined) updates.value = body.value;
    if (body.minOrderValue !== undefined) updates.minOrderValue = body.minOrderValue;
    if (body.maxDiscount !== undefined) updates.maxDiscount = body.maxDiscount;
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.expiresAt !== undefined) updates.expiresAt = new Date(body.expiresAt);
    if (body.timezone !== undefined) updates.timezone = body.timezone;
    if (body.usageLimit !== undefined) updates.usageLimit = body.usageLimit;
    if (body.perUserLimit !== undefined) updates.perUserLimit = body.perUserLimit;
    if (body.firstOrderOnly !== undefined) updates.firstOrderOnly = body.firstOrderOnly;
    if (body.restoreOnCancel !== undefined) updates.restoreOnCancel = body.restoreOnCancel;

    if (body.status !== undefined) {
      updates.status = body.status;
    } else if (body.isActive !== undefined) {
      updates.status = body.isActive ? "active" : "disabled";
    }

    if (body.applicableProducts !== undefined) {
      const applicableProducts = filterObjectIds(body.applicableProducts);
      if (applicableProducts.length > 0) {
        const found = await Product.countDocuments({ _id: { $in: applicableProducts } });
        if (found !== applicableProducts.length) {
          return errorResponse("One or more applicable products were not found", 400);
        }
      }
      updates.applicableProducts = applicableProducts;
    }

    if (body.applicableCategories !== undefined) {
      const applicableCategories = filterObjectIds(body.applicableCategories);
      if (applicableCategories.length > 0) {
        const found = await Category.countDocuments({ _id: { $in: applicableCategories } });
        if (found !== applicableCategories.length) {
          return errorResponse("One or more applicable categories were not found", 400);
        }
      }
      updates.applicableCategories = applicableCategories;
    }

    if (body.excludedProducts !== undefined) {
      const excludedProducts = filterObjectIds(body.excludedProducts);
      if (excludedProducts.length > 0) {
        const found = await Product.countDocuments({ _id: { $in: excludedProducts } });
        if (found !== excludedProducts.length) {
          return errorResponse("One or more excluded products were not found", 400);
        }
      }
      updates.excludedProducts = excludedProducts;
    }

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

    return successResponse(
      withLifecycle(coupon.toJSON() as Record<string, unknown>),
      "Coupon updated"
    );
  } catch (err) {
    console.error("PUT /api/admin/coupons/:id error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A coupon with this code already exists", 409);
    }
    return errorResponse("Failed to update coupon", 500);
  }
}

// ─── DELETE /api/admin/coupons/:id — Soft-delete coupon ──────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(request, "coupons.delete");
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

    coupon.deletedAt = new Date();
    coupon.status = "disabled";
    coupon.updatedBy = new Types.ObjectId(auth.userId);
    await coupon.save();

    return successResponse(null, "Coupon deleted");
  } catch (err) {
    console.error("DELETE /api/admin/coupons/:id error:", err);
    return errorResponse("Failed to delete coupon", 500);
  }
}
