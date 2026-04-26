import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { signToken } from "@/lib/auth/jwt";
import { setTokenCookie } from "@/lib/auth/cookies";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidEmail } from "@/lib/validators";
import { LoginBody } from "@/types";

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginBody;
    const { email, password } = body;

    // ── Validate input ────────────────────────────────────────────────────
    if (!email || !password) {
      return errorResponse("Email and password are required", 400);
    }

    if (!isValidEmail(email)) {
      return errorResponse("Invalid email address", 400);
    }

    // ── Authenticate ──────────────────────────────────────────────────────
    await connectDB();

    // Explicitly select password field which is excluded by default
    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user) {
      return errorResponse("Invalid credentials", 401);
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated. Contact support.", 403);
    }

    if (!user.isEmailVerified) {
      return errorResponse(
        "Please verify your email before signing in. Check your inbox for the verification link.",
        403
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse("Invalid credentials", 401);
    }

    // ── Issue JWT ─────────────────────────────────────────────────────────
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
          phone: user.phone || null,
          picture: user.picture || null,
          role: user.role,
        },
      },
      "Login successful"
    );

    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error("[Login]", error);
    return errorResponse("Login failed. Please try again later.", 500);
  }
}
