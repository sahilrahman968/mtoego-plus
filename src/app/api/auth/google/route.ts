import { NextRequest } from "next/server";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { signToken } from "@/lib/auth/jwt";
import { setTokenCookie } from "@/lib/auth/cookies";
import { successResponse, errorResponse } from "@/lib/api-response";
import { env } from "@/lib/env";

// POST /api/auth/google — Sign in or register with Google
export async function POST(request: NextRequest) {
  try {
    const googleClientId = env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return errorResponse("Google OAuth is not configured on the server", 501);
    }

    const body = await request.json();
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return errorResponse("Google credential is required", 400);
    }

    // Verify the Google ID token
    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
      return errorResponse("Invalid Google token or unverified email", 400);
    }

    const { email, name, sub: googleId } = payload;

    await connectDB();

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // Existing user — link Google account if not already linked
      if (!user.isActive) {
        return errorResponse("Account is deactivated. Contact support.", 403);
      }

      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // New user — create account with a random password
      const randomPassword =
        crypto.randomBytes(32).toString("hex") +
        "A1a!"; // Ensure it passes password strength validators

      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        password: randomPassword,
        role: "customer",
        googleId,
      });
    }

    // Issue JWT
    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = successResponse(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      user.googleId === googleId && !user.isNew
        ? "Login successful"
        : "Account created successfully"
    );

    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error("[Google Auth]", error);

    if (
      error instanceof Error &&
      error.message.includes("Token used too late")
    ) {
      return errorResponse("Google token has expired. Please try again.", 400);
    }

    return errorResponse("Google authentication failed. Please try again.", 500);
  }
}
