import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { validateCreateCategory } from "@/lib/validators";
import Category from "@/models/category.model";

// ─── GET /api/admin/categories — List all categories (including inactive) ───

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    const parentParam = searchParams.get("parent");
    if (parentParam === "null") {
      filter.parent = null;
    } else if (parentParam) {
      filter.parent = parentParam;
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .populate("parent", "name slug")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(filter),
    ]);

    return successResponse({
      items: categories,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("[Categories] List error:", err);
    return errorResponse("Failed to fetch categories", 500);
  }
}

// ─── POST /api/admin/categories — Create a category ─────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const body = await request.json();
    const validation = validateCreateCategory(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    // Check for duplicate slug
    const existing = await Category.findOne({ slug: body.slug }).lean();
    if (existing) {
      return errorResponse("A category with this slug already exists", 409);
    }

    // If parent is specified, verify it exists
    if (body.parent) {
      const parentExists = await Category.findById(body.parent).lean();
      if (!parentExists) {
        return errorResponse("Parent category not found", 404);
      }
    }

    const category = await Category.create({
      name: body.name.trim(),
      slug: body.slug.toLowerCase().trim(),
      description: body.description?.trim(),
      image: body.image ?? undefined,
      parent: body.parent ?? null,
      isActive: body.isActive ?? true,
    });

    return successResponse(category, "Category created successfully", 201);
  } catch (err) {
    console.error("[Categories] Create error:", err);
    if ((err as { code?: number }).code === 11000) {
      return errorResponse("A category with this slug already exists", 409);
    }
    return errorResponse("Failed to create category", 500);
  }
}
