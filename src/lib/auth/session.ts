import { connectDB } from "@/lib/db/mongoose";
import User, { IUserDocument } from "@/models/user.model";
import { getTokenFromCookies } from "./cookies";
import { verifyToken } from "./jwt";

// ─── Session Helper ─────────────────────────────────────────────────────────
// Reads the JWT from the request cookies, verifies it, and returns the full
// user document (excluding password). Useful inside server components and
// API route handlers.

export async function getCurrentUser(): Promise<IUserDocument | null> {
  const token = await getTokenFromCookies();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  await connectDB();
  const user = await User.findById(payload.userId).select("-password");
  if (!user || !user.isActive) return null;

  return user;
}
