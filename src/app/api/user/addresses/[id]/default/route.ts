import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import {
  setDefaultUserAddress,
  toSavedAddressResponse,
} from "@/lib/addresses/user-address-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid address ID", 400);
    }

    await connectDB();

    const doc = await setDefaultUserAddress(auth.userId, id);
    if (!doc) {
      return errorResponse("Address not found", 404);
    }

    return successResponse(toSavedAddressResponse(doc), "Default address updated");
  } catch (err) {
    console.error("POST /api/user/addresses/[id]/default error:", err);
    return errorResponse("Failed to set default address", 500);
  }
}
