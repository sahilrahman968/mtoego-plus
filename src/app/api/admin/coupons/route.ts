import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateCreateCoupon } from "@/lib/validators";
import Coupon from "@/models/coupon.model";

// ─── GET /api/admin/coupons — List all coupons (paginated) ───────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search")?.trim();

    await connectDB();

    // Build filter
    const filter: Record<string, unknown> = {};
    if (isActive === "true") filter.isActive = true;
    if (isActive === "false") filter.isActive = false;
    if (search) {
      filter.code = { $regex: search, $options: "i" };
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      {
        items: coupons,
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
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateCreateCoupon(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    await connectDB();

    // Check for duplicate code
    const existing = await Coupon.findOne({
      code: body.code.trim().toUpperCase(),
    });
    if (existing) {
      return errorResponse("A coupon with this code already exists", 409);
    }

    const coupon = await Coupon.create({
      code: body.code.trim().toUpperCase(),
      description: body.description,
      type: body.type,
      value: body.value,
      minOrderValue: body.minOrderValue ?? 0,
      maxDiscount: body.maxDiscount ?? null,
      expiresAt: new Date(body.expiresAt),
      usageLimit: body.usageLimit,
      perUserLimit: body.perUserLimit ?? 1,
      isActive: body.isActive ?? true,
    });

    return successResponse(coupon.toJSON(), "Coupon created", 201);
  } catch (err) {
    console.error("POST /api/admin/coupons error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A coupon with this code already exists", 409);
    }
    return errorResponse("Failed to create coupon", 500);
  }
}
