import { AsyncLocalStorage } from "async_hooks";
import type { NextRequest } from "next/server";
import type { AuditMethod } from "@/models/audit-log.model";

export interface AuditContext {
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  method: AuditMethod;
  path: string;
  resource: string;
  resourceId: string | null;
  ip: string | null;
  userAgent: string | null;
  summary: string | null;
  statusCode: number;
  message: string;
  settled: boolean;
}

const auditStorage = new AsyncLocalStorage<AuditContext>();

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutationMethod(method: string): method is AuditMethod {
  return MUTATION_METHODS.has(method.toUpperCase());
}

/** Parse /api/admin/{resource}/{id?}/... into resource + optional id. */
export function parseAdminResource(pathname: string): {
  resource: string;
  resourceId: string | null;
} {
  const parts = pathname
    .replace(/^\/api\/admin\/?/, "")
    .split("/")
    .filter(Boolean);

  const resource = parts[0] || "admin";
  const maybeId = parts[1];
  const resourceId =
    maybeId &&
    (/^[a-f\d]{24}$/i.test(maybeId) ||
      /^[a-z][a-z0-9_]{1,31}$/i.test(maybeId))
      ? maybeId
      : null;

  return { resource, resourceId };
}

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

/**
 * Start an audit context for admin mutations. Safe to call multiple times —
 * subsequent calls are no-ops if a context already exists.
 */
export function beginAdminMutationAudit(
  request: NextRequest,
  actor: { userId: string; email: string; role: string }
): AuditContext | null {
  const existing = auditStorage.getStore();
  if (existing) return existing;

  const method = request.method.toUpperCase();
  if (!isMutationMethod(method)) return null;

  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/admin")) return null;
  if (path.startsWith("/api/admin/audit-logs")) return null;

  const { resource, resourceId } = parseAdminResource(path);
  const ua = request.headers.get("user-agent");

  const ctx: AuditContext = {
    actorUserId: actor.userId,
    actorEmail: actor.email,
    actorRole: actor.role,
    method,
    path,
    resource,
    resourceId,
    ip: clientIp(request),
    userAgent: ua ? ua.slice(0, 400) : null,
    summary: null,
    statusCode: 0,
    message: "",
    settled: false,
  };

  auditStorage.enterWith(ctx);
  return ctx;
}

export function getAuditContext(): AuditContext | undefined {
  return auditStorage.getStore();
}

/** Optional enrichment from a route handler (e.g. human-readable summary). */
export function setAuditSummary(summary: string): void {
  const ctx = auditStorage.getStore();
  if (ctx && !ctx.settled) {
    ctx.summary = summary.slice(0, 1000);
  }
}

export function setAuditResourceId(resourceId: string): void {
  const ctx = auditStorage.getStore();
  if (ctx && !ctx.settled) {
    ctx.resourceId = resourceId;
  }
}
