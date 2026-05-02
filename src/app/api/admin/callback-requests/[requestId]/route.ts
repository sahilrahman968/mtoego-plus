import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId, sanitize } from "@/lib/validators";
import {
  CALLBACK_REQUEST_STATUSES,
  type CallbackRequestStatus,
} from "@/models/callback-request.model";
import CallbackRequest from "@/models/callback-request.model";

type RouteParams = { params: Promise<{ requestId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { requestId } = await params;
    if (!isValidObjectId(requestId)) {
      return errorResponse("Invalid request ID", 400);
    }

    const body = (await request.json()) as {
      status?: unknown;
      adminNote?: unknown;
    };
    const status = typeof body.status === "string" ? body.status : "";
    const adminNote = typeof body.adminNote === "string" ? sanitize(body.adminNote) : "";

    if (!CALLBACK_REQUEST_STATUSES.includes(status as CallbackRequestStatus)) {
      return errorResponse("Invalid status", 400);
    }
    if (adminNote.length > 400) {
      return errorResponse("Admin note must be at most 400 characters", 400);
    }

    await connectDB();

    const callbackRequest = await CallbackRequest.findById(requestId);
    if (!callbackRequest) {
      return errorResponse("Request not found", 404);
    }

    callbackRequest.status = status as CallbackRequestStatus;
    callbackRequest.adminNote = adminNote;
    callbackRequest.handledBy = auth.userId;
    if (status === "contacted" && !callbackRequest.contactedAt) {
      callbackRequest.contactedAt = new Date();
    }

    await callbackRequest.save();
    return successResponse(callbackRequest, "Request updated");
  } catch (err) {
    console.error("PATCH /api/admin/callback-requests/[requestId] error:", err);
    return errorResponse("Failed to update callback request", 500);
  }
}
