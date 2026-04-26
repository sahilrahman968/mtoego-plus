import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import OtpVerification from "@/models/otp-verification.model";
import { signToken } from "@/lib/auth/jwt";
import { setTokenCookie } from "@/lib/auth/cookies";
import { successResponse, errorResponse } from "@/lib/api-response";
import { verifyOtpHash } from "@/lib/sms";
import { VerifyOtpBody } from "@/types";
import { sanitize } from "@/lib/validators";

const MAX_VERIFY_ATTEMPTS = 5;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

// POST /api/auth/verify-otp
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as VerifyOtpBody;
    const { phone: rawPhone, otp, name } = body;

    if (!rawPhone || !otp) {
      return errorResponse("Phone number and OTP are required", 400);
    }

    if (!/^\d{6}$/.test(otp)) {
      return errorResponse("OTP must be a 6-digit number", 400);
    }

    const phone = normalizePhone(rawPhone);

    await connectDB();

    const record = await OtpVerification.findOne({ phone });

    if (!record) {
      return errorResponse("No OTP was requested for this number. Please request a new OTP.", 400);
    }

    if (record.expiresAt < new Date()) {
      await OtpVerification.deleteOne({ _id: record._id });
      return errorResponse("OTP has expired. Please request a new one.", 400);
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await OtpVerification.deleteOne({ _id: record._id });
      return errorResponse("Too many incorrect attempts. Please request a new OTP.", 429);
    }

    const isValid = verifyOtpHash(otp, record.otpHash);

    if (!isValid) {
      record.attempts += 1;
      await record.save();
      return errorResponse("Incorrect OTP. Please try again.", 400);
    }

    await OtpVerification.deleteOne({ _id: record._id });

    let user = await User.findOne({ phone });

    if (user) {
      if (!user.isActive) {
        return errorResponse("Account is deactivated. Contact support.", 403);
      }
      if (!user.isPhoneVerified) {
        user.isPhoneVerified = true;
        await user.save();
      }
    } else {
      if (!name || name.trim().length < 2) {
        return successResponse(
          { needsName: true, phone },
          "Please provide your name to complete registration"
        );
      }

      const cleanName = sanitize(name);

      const randomPassword =
        crypto.randomBytes(32).toString("hex") + "A1a!";

      user = await User.create({
        name: cleanName,
        phone,
        password: randomPassword,
        role: "customer",
        isPhoneVerified: true,
        isEmailVerified: false,
      });
    }

    const token = await signToken({
      userId: user._id.toString(),
      email: user.email || "",
      role: user.role,
    });

    const response = successResponse(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email || null,
          phone: user.phone,
          picture: user.picture || null,
          role: user.role,
        },
      },
      user.isNew ? "Account created successfully" : "Login successful"
    );

    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error("[Verify OTP]", error);
    return errorResponse("OTP verification failed. Please try again.", 500);
  }
}
