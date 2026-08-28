import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateSavedAddress } from "@/lib/validators";
import { sanitizeAddressInput } from "@/lib/addresses/validate-address";
import {
  createUserAddress,
  toSavedAddressResponse,
} from "@/lib/addresses/user-address-service";
import UserAddress from "@/models/user-address.model";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    await connectDB();

    const addresses = await UserAddress.find({ user: auth.userId })
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();

    return successResponse(
      { addresses: addresses.map(toSavedAddressResponse) },
      "Addresses retrieved"
    );
  } catch (err) {
    console.error("GET /api/user/addresses error:", err);
    return errorResponse("Failed to retrieve addresses", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

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

    try {
      const doc = await createUserAddress(auth.userId, {
        ...input,
        isDefault: body.isDefault === true,
      });
      return successResponse(
        toSavedAddressResponse(doc),
        "Address saved",
        201
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save address";
      return errorResponse(message, 400);
    }
  } catch (err) {
    console.error("POST /api/user/addresses error:", err);
    return errorResponse("Failed to save address", 500);
  }
}
