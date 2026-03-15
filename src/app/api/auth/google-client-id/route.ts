import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/auth/google-client-id — Return the public Google Client ID
export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return errorResponse("Google OAuth is not configured", 404);
    }

    return successResponse({ clientId });
  } catch (error) {
    console.error("[Google Client ID]", error);
    return errorResponse("Failed to fetch Google Client ID", 500);
  }
}
