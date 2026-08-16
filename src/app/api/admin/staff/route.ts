import { NextRequest } from "next/server";
import crypto from "crypto";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { isValidEmail } from "@/lib/validators";

// ─── GET /api/admin/staff ────────────────────────────────────────────────────
// List all staff and super_admin users. Super admin only.

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";

    const filter: Record<string, unknown> = {
      role: { $in: ["super_admin", "staff"] },
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse({
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("[Staff List] Error:", err);
    return errorResponse("Failed to fetch staff list");
  }
}

// ─── POST /api/admin/staff ───────────────────────────────────────────────────
// Create a new staff member by email. They sign in via Google at /admin/login.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string") {
      return errorResponse("Email is required", 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      return errorResponse("Please provide a valid email address", 400);
    }

    if (!["staff", "super_admin"].includes(role)) {
      return errorResponse("Role must be staff or super_admin", 400);
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      if (["super_admin", "staff"].includes(existing.role)) {
        return errorResponse("A staff member with this email already exists", 409);
      }

      // Promote an existing customer account to the requested admin role
      existing.role = role;
      existing.isActive = true;
      await existing.save();

      return successResponse(existing.toJSON(), "Existing user promoted to staff", 200);
    }

    const localPart = normalizedEmail.split("@")[0] || "Staff";
    const name = localPart.length >= 2 ? localPart : `${localPart} user`;
    const randomPassword =
      crypto.randomBytes(32).toString("hex") + "A1a!";

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: randomPassword,
      role,
      isActive: true,
      isEmailVerified: true,
    });

    return successResponse(user.toJSON(), "Staff member created successfully", 201);
  } catch (err) {
    console.error("[Staff Create] Error:", err);
    return errorResponse("Failed to create staff member");
  }
}
