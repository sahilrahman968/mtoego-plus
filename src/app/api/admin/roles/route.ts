import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import Role from "@/models/role.model";
import {
  ensureSystemRoles,
  listAdminRoles,
  slugifyRoleName,
  isSystemRoleSlug,
} from "@/lib/auth/roles";
import {
  PERMISSION_CATALOG,
  sanitizePermissions,
} from "@/lib/auth/permissions";

// ─── GET /api/admin/roles ────────────────────────────────────────────────────
// List admin roles + permission catalog. Super admin only.

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    await ensureSystemRoles();

    const roles = await listAdminRoles();

    return successResponse({
      roles,
      catalog: PERMISSION_CATALOG,
    });
  } catch (err) {
    console.error("[Roles List] Error:", err);
    return errorResponse("Failed to fetch roles");
  }
}

// ─── POST /api/admin/roles ───────────────────────────────────────────────────
// Create a custom admin role. Super admin only.

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();
    await ensureSystemRoles();

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const permissions = sanitizePermissions(body.permissions);

    if (name.length < 2) {
      return errorResponse("Role name must be at least 2 characters", 400);
    }

    let slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim().toLowerCase()
        : slugifyRoleName(name);

    if (!/^[a-z][a-z0-9_]{1,31}$/.test(slug)) {
      return errorResponse(
        "Slug must be 2–32 characters: lowercase letters, numbers, underscores",
        400
      );
    }

    if (isSystemRoleSlug(slug) || slug === "customer") {
      return errorResponse("This role slug is reserved", 400);
    }

    const existing = await Role.findOne({ slug });
    if (existing) {
      return errorResponse("A role with this slug already exists", 409);
    }

    const role = await Role.create({
      slug,
      name,
      description,
      permissions,
      isSystem: false,
      isAdmin: true,
    });

    return successResponse(role.toJSON(), "Role created successfully", 201);
  } catch (err) {
    console.error("[Roles Create] Error:", err);
    return errorResponse("Failed to create role");
  }
}
