import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateSavedAddress, isValidObjectId } from "@/lib/validators";
import { sanitizeAddressInput } from "@/lib/addresses/validate-address";
import {
  deleteUserAddress,
  toSavedAddressResponse,
  updateUserAddress,
} from "@/lib/addresses/user-address-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid address ID", 400);
    }

    const body = await request.json();
    const validation = validateSavedAddress(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const input = sanitizeAddressInput(body);
    if (!input.label) {
      return errorResponse("Address label is required", 400);
    }

    await connectDB();

    const doc = await updateUserAddress(auth.userId, id, {
      ...input,
      isDefault: body.isDefault,
    });

    if (!doc) {
      return errorResponse("Address not found", 404);
    }

    return successResponse(toSavedAddressResponse(doc), "Address updated");
  } catch (err) {
    console.error("PATCH /api/user/addresses/[id] error:", err);
    return errorResponse("Failed to update address", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid address ID", 400);
    }

    await connectDB();

    const doc = await deleteUserAddress(auth.userId, id);
    if (!doc) {
      return errorResponse("Address not found", 404);
    }

    return successResponse(null, "Address deleted");
  } catch (err) {
    console.error("DELETE /api/user/addresses/[id] error:", err);
    return errorResponse("Failed to delete address", 500);
  }
}
