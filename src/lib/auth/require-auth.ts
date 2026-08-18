import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { UserRole } from "@/types";
import {
  Permission,
  hasPermission,
  isAdminPanelRole,
} from "@/lib/auth/permissions";
import { getPermissionsForRole } from "@/lib/auth/roles";
import { connectDB } from "@/lib/db/mongoose";
import { beginAdminMutationAudit } from "@/lib/audit/context";

// ─── Route Handler Auth Guard ───────────────────────────────────────────────
// Secondary layer inside route handlers. Edge proxy already verifies tokens
// and sets x-user-* headers.

interface AuthSuccess {
  error: null;
  userId: string;
  email: string;
  role: UserRole;
}

interface AuthFailure {
  error: ReturnType<typeof errorResponse>;
  userId?: never;
  email?: never;
  role?: never;
}

export function requireAuth(
  request: NextRequest,
  allowedRoles: UserRole[] = []
): AuthSuccess | AuthFailure {
  const userId = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  const role = request.headers.get("x-user-role") as UserRole | null;

  if (!userId || !role) {
    return { error: errorResponse("Authentication required", 401) };
  }

  // Start audit as soon as we know who is mutating (before role checks),
  // so denied writes are also recorded.
  beginAdminMutationAudit(request, {
    userId,
    email: email || "",
    role,
  });

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return { error: errorResponse("Insufficient permissions", 403) };
  }

  return { error: null, userId, email: email || "", role };
}

/** Require an authenticated admin-panel user (any non-customer role). */
export function requireAdminAuth(
  request: NextRequest
): AuthSuccess | AuthFailure {
  const auth = requireAuth(request);
  if (auth.error) return auth;
  if (!isAdminPanelRole(auth.role)) {
    return { error: errorResponse("Insufficient permissions", 403) };
  }
  return auth;
}

/**
 * Require a specific ACL permission (or any of several).
 * Super admins always pass. Permissions are loaded from the Role document.
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission | Permission[]
): Promise<AuthSuccess | AuthFailure> {
  const auth = requireAdminAuth(request);
  if (auth.error) return auth;

  if (auth.role === "super_admin") return auth;

  try {
    await connectDB();
    const granted = await getPermissionsForRole(auth.role);
    if (!hasPermission(granted, permission)) {
      return { error: errorResponse("Insufficient permissions", 403) };
    }
    return auth;
  } catch (err) {
    console.error("[requirePermission]", err);
    return { error: errorResponse("Failed to verify permissions", 500) };
  }
}
