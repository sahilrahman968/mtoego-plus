import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import User from "@/models/user.model";
import { signToken } from "@/lib/auth/jwt";
import { setTokenCookie } from "@/lib/auth/cookies";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidEmail, isStrongPassword, sanitize } from "@/lib/validators";
import { RegisterBody } from "@/types";

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

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password, // hashed by pre‑save hook
      role: "customer", // public registrations are always customers
    });

    // ── Issue JWT ─────────────────────────────────────────────────────────
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
      "Registration successful",
      201
    );

    setTokenCookie(response, token);
    return response;
  } catch (error) {
    console.error("[Register]", error);

    // Mongoose duplicate key error
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
