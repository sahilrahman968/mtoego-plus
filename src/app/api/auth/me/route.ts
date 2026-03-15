import { getCurrentUser } from "@/lib/auth/session";
import { successResponse, errorResponse } from "@/lib/api-response";

// GET /api/auth/me — return the currently authenticated user
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse("Not authenticated", 401);
    }

    return successResponse({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[Me]", error);
    return errorResponse("Failed to fetch user profile", 500);
  }
}
