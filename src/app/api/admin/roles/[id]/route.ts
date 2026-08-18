import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import Role from "@/models/role.model";
import User from "@/models/user.model";
import { ensureSystemRoles } from "@/lib/auth/roles";
import { sanitizePermissions } from "@/lib/auth/permissions";

type RouteParams = { params: Promise<{ id: string }> };

async function findRole(idOrSlug: string) {
  if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
    const byId = await Role.findById(idOrSlug);
    if (byId) return byId;
  }
  return Role.findOne({ slug: idOrSlug.toLowerCase() });
}

// ─── GET /api/admin/roles/:id ────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    await connectDB();
    await ensureSystemRoles();

    const role = await findRole(id);
    if (!role || !role.isAdmin) {
      return errorResponse("Role not found", 404);
    }

    return successResponse(role.toJSON());
  } catch (err) {
    console.error("[Roles Get] Error:", err);
    return errorResponse("Failed to fetch role");
  }
}

// ─── PUT /api/admin/roles/:id ────────────────────────────────────────────────
// Update name, description, and/or permissions (ACL). Super admin only.

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    await connectDB();
    await ensureSystemRoles();

    const role = await findRole(id);
    if (!role || !role.isAdmin) {
      return errorResponse("Role not found", 404);
    }

    if (role.slug === "super_admin") {
      return errorResponse(
        "Super admin permissions cannot be modified",
        400
      );
    }

    const body = await request.json();

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length < 2) {
        return errorResponse("Role name must be at least 2 characters", 400);
      }
      role.name = body.name.trim();
    }

    if (body.description !== undefined) {
      role.description =
        typeof body.description === "string" ? body.description.trim() : "";
    }

    if (body.permissions !== undefined) {
      role.permissions = sanitizePermissions(body.permissions);
    }

    await role.save();

    return successResponse(role.toJSON(), "Role updated successfully");
  } catch (err) {
    console.error("[Roles Update] Error:", err);
    return errorResponse("Failed to update role");
  }
}

// ─── DELETE /api/admin/roles/:id ─────────────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    await connectDB();
    await ensureSystemRoles();

    const role = await findRole(id);
    if (!role || !role.isAdmin) {
      return errorResponse("Role not found", 404);
    }

    if (role.isSystem) {
      return errorResponse("System roles cannot be deleted", 400);
    }

    const usersWithRole = await User.countDocuments({ role: role.slug });
    if (usersWithRole > 0) {
      return errorResponse(
        `Cannot delete role: ${usersWithRole} user(s) still assigned. Reassign them first.`,
        409
      );
    }

    await role.deleteOne();

    return successResponse(null, "Role deleted successfully");
  } catch (err) {
    console.error("[Roles Delete] Error:", err);
    return errorResponse("Failed to delete role");
  }
}
