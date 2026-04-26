import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidEmail, isStrongPassword, sanitize } from "@/lib/validators";
import { sendVerificationEmail } from "@/lib/email";
import { RegisterBody } from "@/types";

const TOKEN_EXPIRY_HOURS = 24;

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterBody;
    const { name, email, password } = body;

    // ── Validate input ────────────────────────────────────────────────────
    if (!name || !email || !password) {
      return errorResponse("Name, email and password are required", 400);
    }

    const cleanName = sanitize(name);
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return errorResponse("Name must be at least 2 characters", 400);
    }

    if (!isValidEmail(cleanEmail)) {
      return errorResponse("Invalid email address", 400);
    }

    if (!isStrongPassword(password)) {
      return errorResponse(
        "Password must be at least 8 characters with 1 uppercase, 1 lowercase and 1 digit",
        400
      );
    }

    // ── Persist ───────────────────────────────────────────────────────────
    await connectDB();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return errorResponse("Email is already registered", 409);
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: "customer",
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Fire-and-forget — don't block the response on email delivery
    sendVerificationEmail(user.email!, user.name, verificationToken).catch(
      (err) => console.error("[Register] Failed to send verification email:", err)
    );

    return successResponse(
      { email: user.email },
      "Registration successful. Please check your email to verify your account.",
      201
    );
  } catch (error) {
    console.error("[Register]", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return errorResponse("Email is already registered", 409);
    }

    return errorResponse("Registration failed. Please try again later.", 500);
  }
}
