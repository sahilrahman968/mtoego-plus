import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import mongoose from "mongoose";

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

    const body = await request.json();
    const { name, role, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) {
      if (!["staff", "super_admin"].includes(role)) {
        return errorResponse("Role must be staff or super_admin", 400);
      }
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    // Prevent deactivating yourself
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

    // Prevent deleting yourself
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
