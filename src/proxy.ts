import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { isAdminPanelRole } from "@/lib/auth/permissions";

// ─── Route Protection Configuration ─────────────────────────────────────────
// Coarse gates only — fine-grained ACL is enforced in route handlers via
// requirePermission(). More specific rules should come first.

interface RouteRule {
  pathPrefix: string;
  /** When true, only super_admin may access. Otherwise any admin-panel role. */
  superAdminOnly?: boolean;
  /** When true, any authenticated user (including customer) may access. */
  anyAuthenticated?: boolean;
}

const protectedRoutes: RouteRule[] = [
  {
    pathPrefix: "/api/admin/super",
    superAdminOnly: true,
  },
  {
    pathPrefix: "/api/admin/staff",
    superAdminOnly: true,
  },
  {
    pathPrefix: "/api/admin/roles",
    superAdminOnly: true,
  },
  {
    pathPrefix: "/api/admin/audit-logs",
    superAdminOnly: true,
  },
  {
    pathPrefix: "/api/admin",
  },
  {
    pathPrefix: "/api/user",
    anyAuthenticated: true,
  },
];

const publicPaths = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
  "/api/auth/google",
  "/api/auth/google-client-id",
  "/api/webhooks/",
  "/admin/login",
];

function attachUserHeaders(
  request: NextRequest,
  payload: { userId: string; email: string; role: string }
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPageRoute = !pathname.startsWith("/api/");

  // ── Admin page protection ─────────────────────────────────────────────
  if (isPageRoute && pathname.startsWith("/admin")) {
    const token = request.cookies.get("token")?.value;
    const loginUrl = new URL("/admin/login", request.url);

    if (!token) {
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set("token", "", { maxAge: 0, path: "/" });
      return response;
    }

    if (!isAdminPanelRole(payload.role)) {
      return NextResponse.redirect(loginUrl);
    }

    // Staff / roles / audit logs UI — super_admin only
    if (
      (pathname.startsWith("/admin/staff") ||
        pathname.startsWith("/admin/roles") ||
        pathname.startsWith("/admin/audit-logs")) &&
      payload.role !== "super_admin"
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    return attachUserHeaders(request, payload);
  }

  const rule = protectedRoutes.find((r) => pathname.startsWith(r.pathPrefix));

  if (!rule) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const response = NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
    response.cookies.set("token", "", { maxAge: 0, path: "/" });
    return response;
  }

  if (rule.superAdminOnly && payload.role !== "super_admin") {
    return NextResponse.json(
      { success: false, message: "Insufficient permissions" },
      { status: 403 }
    );
  }

  if (!rule.anyAuthenticated && !isAdminPanelRole(payload.role)) {
    return NextResponse.json(
      { success: false, message: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return attachUserHeaders(request, payload);
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
