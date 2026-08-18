import { after } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import AuditLog from "@/models/audit-log.model";
import { getAuditContext, type AuditContext } from "@/lib/audit/context";

async function persistAudit(ctx: AuditContext): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorUserId: ctx.actorUserId,
      actorEmail: ctx.actorEmail,
      actorRole: ctx.actorRole,
      method: ctx.method,
      path: ctx.path,
      resource: ctx.resource,
      resourceId: ctx.resourceId,
      statusCode: ctx.statusCode,
      success: ctx.statusCode >= 200 && ctx.statusCode < 400,
      message: (ctx.message || "").slice(0, 500),
      summary: ctx.summary,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to persist:", err);
  }
}

/**
 * Mark the current mutation audit entry complete and persist it after the
 * response is sent. No-ops when there is no active audit context.
 */
export function flushAdminMutationAudit(
  statusCode: number,
  message = ""
): void {
  const ctx = getAuditContext();
  if (!ctx || ctx.settled) return;

  ctx.statusCode = statusCode;
  ctx.message = message;
  ctx.settled = true;

  try {
    after(() => persistAudit(ctx));
  } catch {
    void persistAudit(ctx);
  }
}
