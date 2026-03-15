import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import bcrypt from "bcryptjs";

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
// Create a new staff member. Super admin only.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();

    const body = await request.json();
    const { name, email, password, role } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return errorResponse("Name, email and password are required", 400);
    }

    if (!["staff", "super_admin"].includes(role)) {
      return errorResponse("Role must be staff or super_admin", 400);
    }

    if (password.length < 8) {
      return errorResponse("Password must be at least 8 characters", 400);
    }

    // Check for existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return errorResponse("A user with this email already exists", 409);
    }

    // Hash password manually since we're using create
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      isActive: true,
    });

    // Return without password
    const userObj = user.toJSON();

    return successResponse(userObj, "Staff member created successfully", 201);
  } catch (err) {
    console.error("[Staff Create] Error:", err);
    return errorResponse("Failed to create staff member");
  }
}
