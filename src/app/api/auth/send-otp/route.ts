import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import OtpVerification from "@/models/otp-verification.model";
import { successResponse, errorResponse } from "@/lib/api-response";
import { generateOtp, sendOtpSms, isIndianPhone } from "@/lib/sms";
import { SendOtpBody } from "@/types";

const RESEND_COOLDOWN_MS = 60_000;
const MAX_ATTEMPTS = 5;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

function isValidPhone(phone: string): boolean {
  if (isIndianPhone(phone)) {
    return /^\+91[6-9]\d{9}$/.test(phone);
  }
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

// POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendOtpBody;
    const { phone: rawPhone } = body;

    if (!rawPhone) {
      return errorResponse("Phone number is required", 400);
    }

    const phone = normalizePhone(rawPhone);

    if (!isValidPhone(phone)) {
      return errorResponse(
        isIndianPhone(phone)
          ? "Please enter a valid 10-digit Indian mobile number"
          : "Please enter a valid phone number with country code",
        400
      );
    }

    await connectDB();

    const existing = await OtpVerification.findOne({ phone });

    if (existing) {
      const age = Date.now() - existing.createdAt.getTime();
      if (age < RESEND_COOLDOWN_MS) {
        return errorResponse("Please wait before requesting another OTP", 429);
      }
      if (existing.attempts >= MAX_ATTEMPTS) {
        return errorResponse(
          "Too many attempts. Please try again after some time.",
          429
        );
      }
    }

    const { otp, hash, expiresAt } = generateOtp();

    await OtpVerification.findOneAndUpdate(
      { phone },
      { otpHash: hash, expiresAt, attempts: 0 },
      { upsert: true, new: true }
    );

    const user = await User.findOne({ phone });

    sendOtpSms(phone, otp).catch((err) =>
      console.error("[Send OTP] SMS delivery failed:", err)
    );

    return successResponse(
      { phone, isExistingUser: !!user },
      "OTP sent successfully"
    );
  } catch (error) {
    console.error("[Send OTP]", error);
    return errorResponse("Failed to send OTP. Please try again.", 500);
  }
}
