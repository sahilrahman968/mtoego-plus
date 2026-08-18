import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";
import { flushAdminMutationAudit } from "@/lib/audit/log";

// ─── Standardised API Response Builder ──────────────────────────────────────

export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiResponse<T>> {
  flushAdminMutationAudit(status, message);
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse<T = unknown>(
  message = "Internal server error",
  status = 500,
  error?: string,
  data?: T
): NextResponse<ApiResponse<T>> {
  flushAdminMutationAudit(status, message);
  return NextResponse.json(
    {
      success: false,
      message,
      error: error ?? message,
      ...(data !== undefined ? { data } : {}),
    },
    { status }
  );
}
