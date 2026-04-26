import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidEmail } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_MS = 60_000; // 1 minute between resends

// POST /api/auth/resend-verification
export async function POST(request: NextRequest) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !isValidEmail(email)) {
      return errorResponse("A valid email is required", 400);
    }

    await connectDB();

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+emailVerificationToken +emailVerificationExpires");

    // Always return a generic success to avoid user enumeration
    const genericMsg =
      "If an account with that email exists and is unverified, a new verification email has been sent.";

    if (!user || user.isEmailVerified) {
      return successResponse(null, genericMsg);
    }

    // Rate-limit: don't resend if the current token was generated less than 1 min ago
    if (user.emailVerificationExpires) {
      const tokenAge =
        TOKEN_EXPIRY_HOURS * 60 * 60 * 1000 -
        (user.emailVerificationExpires.getTime() - Date.now());
      if (tokenAge < RESEND_COOLDOWN_MS) {
        return successResponse(null, genericMsg);
      }
    }

    const newToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = newToken;
    user.emailVerificationExpires = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );
    await user.save();

    sendVerificationEmail(user.email!, user.name, newToken).catch((err) =>
      console.error("[Resend Verification] Email send failed:", err)
    );

    return successResponse(null, genericMsg);
  } catch (error) {
    console.error("[Resend Verification]", error);
    return errorResponse("Something went wrong. Please try again.", 500);
  }
}
