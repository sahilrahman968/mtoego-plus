import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sanitize } from "@/lib/validators";
import { sendCallbackRequestEmail } from "@/lib/email";
import { env } from "@/lib/env";
import User from "@/models/user.model";
import CallbackRequest from "@/models/callback-request.model";

interface CallbackRequestBody {
  requirement?: unknown;
  phone?: unknown;
  contactHours?: unknown;
}

function resolveSuperAdminEmail(adminEmail?: string | null): string {
  if (adminEmail && adminEmail.trim()) return adminEmail.trim().toLowerCase();
  if (env.SUPER_ADMIN_EMAIL.trim()) return env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
  return "";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CallbackRequestBody;

    const requirement = typeof body.requirement === "string" ? sanitize(body.requirement) : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const contactHours = typeof body.contactHours === "string" ? sanitize(body.contactHours) : "";

    if (requirement.length < 8 || requirement.length > 1200) {
      return errorResponse("Requirement must be between 8 and 1200 characters", 400);
    }
    if (!/^[+]?[0-9\s\-()]{7,20}$/.test(phone)) {
      return errorResponse("Please provide a valid phone number", 400);
    }
    if (contactHours.length < 3 || contactHours.length > 80) {
      return errorResponse("Preferred contact hours must be between 3 and 80 characters", 400);
    }

    await connectDB();
    const sourceUrl = request.headers.get("referer") ?? request.headers.get("origin") ?? env.APP_URL;

    const savedRequest = await CallbackRequest.create({
      requirement,
      phone,
      contactHours,
      sourceUrl,
      status: "new",
    });

    const superAdmin = await User.findOne({
      role: "super_admin",
      isActive: true,
      email: { $exists: true, $ne: null },
    })
      .sort({ createdAt: 1 })
      .select("email")
      .lean<{ email?: string | null }>();

    const superAdminEmail = resolveSuperAdminEmail(superAdmin?.email);
    if (!superAdminEmail) {
      return errorResponse("Super admin email is not configured", 500);
    }

    await sendCallbackRequestEmail(superAdminEmail, {
      requirement,
      phone,
      contactHours,
      sourceUrl,
    });

    return successResponse(
      {
        sent: true,
        requestId: String(savedRequest._id),
      },
      "Callback request sent",
      201
    );
  } catch (err) {
    console.error("POST /api/callback-request error:", err);
    return errorResponse("Failed to submit callback request", 500);
  }
}
