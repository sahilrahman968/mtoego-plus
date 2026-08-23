import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId, validateCreateCoupon } from "@/lib/validators";
import Coupon, { CouponStatus } from "@/models/coupon.model";
import Product from "@/models/product.model";
import Category from "@/models/category.model";
import { resolveCouponStatus } from "@/lib/coupons";

function resolveStatusFromBody(body: Record<string, unknown>): CouponStatus {
  if (typeof body.status === "string") {
    return body.status as CouponStatus;
  }
  if (body.isActive === false) return "disabled";
  return "active";
}

function filterObjectIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (id: unknown): id is string => typeof id === "string" && isValidObjectId(id)
      )
    : [];
}

async function assertProductsExist(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  const found = await Product.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) return "One or more products were not found";
  return null;
}

async function assertCategoriesExist(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  const found = await Category.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) return "One or more categories were not found";
  return null;
}

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

// ─── GET /api/admin/coupons — List all coupons (paginated) ───────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "coupons.list");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;
    const isActive = searchParams.get("isActive");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    await connectDB();

    const filter: Record<string, unknown> = { deletedAt: null };
    const now = new Date();

    if (status === "scheduled") {
      filter.status = "active";
      filter.startsAt = { $gt: now };
    } else if (status === "expired") {
      filter.expiresAt = { $lte: now };
      filter.status = { $in: ["active", "paused"] };
    } else if (status === "exhausted") {
      filter.status = "active";
      filter.$expr = {
        $and: [
          { $gt: ["$usageLimit", 0] },
          { $gte: ["$usedCount", "$usageLimit"] },
        ],
      };
    } else if (status) {
      filter.status = status;
    } else if (isActive === "true") {
      filter.status = "active";
      filter.startsAt = { $lte: now };
      filter.expiresAt = { $gt: now };
      filter.$expr = {
        $or: [
          { $eq: ["$usageLimit", 0] },
          { $lt: ["$usedCount", "$usageLimit"] },
        ],
      };
    } else if (isActive === "false") {
      filter.status = { $ne: "active" };
    }
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      {
        items: coupons.map((c) => withLifecycle(c as Record<string, unknown>)),
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      "Coupons retrieved"
    );
  } catch (err) {
    console.error("GET /api/admin/coupons error:", err);
    return errorResponse("Failed to retrieve coupons", 500);
  }
}

// ─── POST /api/admin/coupons — Create a new coupon ───────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "coupons.create");
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateCreateCoupon(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    await connectDB();

    const existing = await Coupon.findOne({
      code: body.code.trim().toUpperCase(),
    });
    if (existing) {
      return errorResponse("A coupon with this code already exists", 409);
    }

    const applicableProducts = filterObjectIds(body.applicableProducts);
    const applicableCategories = filterObjectIds(body.applicableCategories);
    const excludedProducts = filterObjectIds(body.excludedProducts);

    const productErr = await assertProductsExist([
      ...applicableProducts,
      ...excludedProducts,
    ]);
    if (productErr) return errorResponse(productErr, 400);

    const categoryErr = await assertCategoriesExist(applicableCategories);
    if (categoryErr) return errorResponse(categoryErr, 400);

    const status = resolveStatusFromBody(body);
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();

    const coupon = await Coupon.create({
      code: body.code.trim().toUpperCase(),
      name: (body.name as string | undefined)?.trim() || body.code.trim().toUpperCase(),
      description: body.description,
      customerDescription: body.customerDescription,
      type: body.type,
      value: body.value,
      minOrderValue: body.minOrderValue ?? 0,
      maxDiscount: body.maxDiscount ?? null,
      startsAt,
      expiresAt: new Date(body.expiresAt),
      timezone: body.timezone || "Asia/Kolkata",
      status,
      usageLimit: body.usageLimit,
      perUserLimit: body.perUserLimit ?? 1,
      applicableProducts,
      applicableCategories,
      excludedProducts,
      firstOrderOnly: body.firstOrderOnly ?? false,
      restoreOnCancel: body.restoreOnCancel ?? true,
      createdBy: new Types.ObjectId(auth.userId),
      updatedBy: new Types.ObjectId(auth.userId),
    });

    return successResponse(
      withLifecycle(coupon.toJSON() as Record<string, unknown>),
      "Coupon created",
      201
    );
  } catch (err) {
    console.error("POST /api/admin/coupons error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A coupon with this code already exists", 409);
    }
    return errorResponse("Failed to create coupon", 500);
  }
}
