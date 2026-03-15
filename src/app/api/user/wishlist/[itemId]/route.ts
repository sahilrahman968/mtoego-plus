import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import Wishlist from "@/models/wishlist.model";

type RouteContext = { params: Promise<{ itemId: string }> };

// ─── DELETE /api/user/wishlist/:itemId — Remove item from wishlist ───────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { itemId } = await context.params;
    if (!isValidObjectId(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    await connectDB();

    const wishlist = await Wishlist.findOne({ user: auth.userId });
    if (!wishlist) {
      return errorResponse("Wishlist not found", 404);
    }

    const itemIndex = wishlist.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex < 0) {
      return errorResponse("Item not found in wishlist", 404);
    }

    wishlist.items.splice(itemIndex, 1);
    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate({
        path: "items.product",
        select: "title slug images isActive variants priceRange",
      })
      .lean();

    return successResponse(populated, "Item removed from wishlist");
  } catch (err) {
    console.error("DELETE /api/user/wishlist/:itemId error:", err);
    return errorResponse("Failed to remove wishlist item", 500);
  }
}
