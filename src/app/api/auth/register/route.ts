import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-response";

// POST /api/auth/register
// Email/password registration is disabled. Customers sign up via Google.
export async function POST(_request: NextRequest) {
  return errorResponse(
    "Email/password registration is no longer available. Please sign up with Google.",
    403
  );
}
