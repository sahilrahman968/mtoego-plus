import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { UserRole } from "@/types";

// ─── Route Protection Configuration ─────────────────────────────────────────
// Define which path prefixes require authentication and which roles are
// allowed. More specific rules should come first — the first match wins.

interface RouteRule {
  /** Path prefix to match (e.g. "/api/admin"). */
  pathPrefix: string;
  /** Roles that are permitted. Empty array = any authenticated user. */
  allowedRoles: UserRole[];
}

const protectedRoutes: RouteRule[] = [
  // Super‑admin‑only API endpoints
  {
    pathPrefix: "/api/admin/super",
    allowedRoles: ["super_admin"],
  },
  // Staff management API — super_admin only
  {
    pathPrefix: "/api/admin/staff",
    allowedRoles: ["super_admin"],
  },
  // General admin API endpoints — accessible by super_admin & staff
  {
    pathPrefix: "/api/admin",
    allowedRoles: ["super_admin", "staff"],
  },
  // Authenticated customer endpoints (orders, profile, etc.)
  {
    pathPrefix: "/api/user",
    allowedRoles: ["super_admin", "staff", "customer"],
  },
];

// ─── Public paths that should never be blocked ──────────────────────────────
const publicPaths = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/webhooks/", // Webhook endpoints use their own signature verification
  "/admin/login", // Admin login page is public
];

// ─── Proxy (was Middleware — renamed in Next.js 16) ─────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public auth routes through without checks
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isPageRoute = !pathname.startsWith("/api/");

  // ── Admin page protection ─────────────────────────────────────────────
  // Admin pages (/admin/*) need auth — redirect to login page on failure
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

    // Only super_admin and staff can access admin pages
    if (!["super_admin", "staff"].includes(payload.role)) {
      return NextResponse.redirect(loginUrl);
    }

    // Staff cannot access /admin/staff pages (super_admin only)
    if (pathname.startsWith("/admin/staff") && payload.role !== "super_admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Attach user info to headers for server components
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-role", payload.role);

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Find the first matching protected rule
  const rule = protectedRoutes.find((r) => pathname.startsWith(r.pathPrefix));

  // If no rule matches, let the request proceed (non-protected route)
  if (!rule) {
    return NextResponse.next();
  }

  // ── Token verification ──────────────────────────────────────────────────
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Clear the invalid/expired cookie
    const response = NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 }
    );
    response.cookies.set("token", "", { maxAge: 0, path: "/" });
    return response;
  }

  // ── Role‑based access control ───────────────────────────────────────────
  if (
    rule.allowedRoles.length > 0 &&
    !rule.allowedRoles.includes(payload.role as UserRole)
  ) {
    return NextResponse.json(
      { success: false, message: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Attach user info to request headers so downstream handlers can read it
  // without having to re-verify the token.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// ─── Matcher ────────────────────────────────────────────────────────────────
// Run proxy on API routes and admin pages
export const config = {
  matcher: ["/api/:path*", "/admin/:path*"],
};
