import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { ensureSystemRoles, getRoleBySlug } from "@/lib/auth/roles";

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/admin/staff/:id ────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid staff ID", 400);
    }

    await connectDB();
    const user = await User.findById(id).select("-password").lean();

    if (!user) {
      return errorResponse("Staff member not found", 404);
    }

    return successResponse(user);
  } catch (err) {
    console.error("[Staff Get] Error:", err);
    return errorResponse("Failed to fetch staff member");
  }
}

// ─── PUT /api/admin/staff/:id ────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid staff ID", 400);
    }

    await connectDB();
    await ensureSystemRoles();

    const body = await request.json();
    const { name, role, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) {
      if (typeof role !== "string") {
        return errorResponse("Invalid role", 400);
      }
      const roleDoc = await getRoleBySlug(role);
      if (!roleDoc || !roleDoc.isAdmin) {
        return errorResponse("Invalid admin role", 400);
      }
      // Prevent demoting yourself away from super_admin
      if (id === auth.userId && roleDoc.slug !== "super_admin") {
        return errorResponse(
          "You cannot change your own role away from Super Admin",
          400
        );
      }
      updateData.role = roleDoc.slug;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    if (isActive === false && id === auth.userId) {
      return errorResponse("You cannot deactivate your own account", 400);
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password")
      .lean();

    if (!user) {
      return errorResponse("Staff member not found", 404);
    }

    return successResponse(user, "Staff member updated successfully");
  } catch (err) {
    console.error("[Staff Update] Error:", err);
    return errorResponse("Failed to update staff member");
  }
}

// ─── DELETE /api/admin/staff/:id ─────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid staff ID", 400);
    }

    if (id === auth.userId) {
      return errorResponse("You cannot delete your own account", 400);
    }

    await connectDB();

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return errorResponse("Staff member not found", 404);
    }

    return successResponse(null, "Staff member deleted successfully");
  } catch (err) {
    console.error("[Staff Delete] Error:", err);
    return errorResponse("Failed to delete staff member");
  }
}
