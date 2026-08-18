import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import AuditLog from "@/models/audit-log.model";

// ─── GET /api/admin/audit-logs ───────────────────────────────────────────────
// Paginated mutation audit trail. Super admin only.

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "30", 10))
    );
    const resource = searchParams.get("resource") || "";
    const method = searchParams.get("method") || "";
    const actor = searchParams.get("actor") || "";
    const successParam = searchParams.get("success");

    const filter: Record<string, unknown> = {};

    if (resource) filter.resource = resource;
    if (method && ["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      filter.method = method;
    }
    if (successParam === "true") filter.success = true;
    if (successParam === "false") filter.success = false;
    if (actor) {
      filter.$or = [
        { actorEmail: { $regex: actor, $options: "i" } },
        { actorRole: { $regex: actor, $options: "i" } },
        { actorUserId: actor },
      ];
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return successResponse({
      items,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("[Audit Logs] Error:", err);
    return errorResponse("Failed to fetch audit logs");
  }
}
