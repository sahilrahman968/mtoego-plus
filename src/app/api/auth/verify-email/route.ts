import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/auth/verify-email?token=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return errorResponse("Verification token is required", 400);
    }

    await connectDB();

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return errorResponse(
        "Invalid or expired verification link. Please request a new one.",
        400
      );
    }

    if (user.isEmailVerified) {
      return successResponse(null, "Email is already verified");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return successResponse(null, "Email verified successfully. You can now sign in.");
  } catch (error) {
    console.error("[Verify Email]", error);
    return errorResponse("Verification failed. Please try again.", 500);
  }
}
