import { removeTokenCookie } from "@/lib/auth/cookies";
import { successResponse } from "@/lib/api-response";

// POST /api/auth/logout
export async function POST() {
  const response = successResponse(null, "Logged out successfully");
  removeTokenCookie(response);
  return response;
}
