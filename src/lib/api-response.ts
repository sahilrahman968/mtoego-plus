import { NextResponse } from "next/server";
import { ApiResponse } from "@/types";

// ─── Standardised API Response Builder ──────────────────────────────────────

export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(
  message = "Internal server error",
  status = 500,
  error?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, message, error: error ?? message },
    { status }
  );
}
