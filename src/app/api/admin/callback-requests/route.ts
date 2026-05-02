import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import {
  CALLBACK_REQUEST_STATUSES,
  type CallbackRequestStatus,
} from "@/models/callback-request.model";
import CallbackRequest from "@/models/callback-request.model";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    const status = request.nextUrl.searchParams.get("status") || "";
    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 15)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (CALLBACK_REQUEST_STATUSES.includes(status as CallbackRequestStatus)) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { requirement: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { contactHours: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      CallbackRequest.find(filter)
        .populate("handledBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CallbackRequest.countDocuments(filter),
    ]);

    return successResponse({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    });
  } catch (err) {
    console.error("GET /api/admin/callback-requests error:", err);
    return errorResponse("Failed to fetch callback requests", 500);
  }
}
