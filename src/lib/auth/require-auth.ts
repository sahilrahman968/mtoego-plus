import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { UserRole } from "@/types";

// ─── Route Handler Auth Guard ───────────────────────────────────────────────
// A secondary layer you can use *inside* individual route handlers for
// defence‑in‑depth. The Edge middleware already verifies tokens and sets
// x-user-* headers, so this helper reads from those headers.
//
// Usage inside a route handler:
//
//   const auth = requireAuth(request, ["super_admin"]);
//   if (auth.error) return auth.error;
//   const { userId, role } = auth;

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

  if (!userId || !email || !role) {
    return { error: errorResponse("Authentication required", 401) };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return { error: errorResponse("Insufficient permissions", 403) };
  }

  return { error: null, userId, email, role };
}
