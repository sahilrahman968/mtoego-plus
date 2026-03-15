import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateWishlistItem } from "@/lib/validators";
import Wishlist from "@/models/wishlist.model";
import Product from "@/models/product.model";

// ─── GET /api/user/wishlist — Get the current user's wishlist ────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    await connectDB();

    const wishlist = await Wishlist.findOne({ user: auth.userId })
      .populate({
        path: "items.product",
        select: "title slug images isActive variants priceRange",
      })
      .lean();

    if (!wishlist) {
      return successResponse({ items: [] }, "Wishlist is empty");
    }

    return successResponse(wishlist, "Wishlist retrieved");
  } catch (err) {
    console.error("GET /api/user/wishlist error:", err);
    return errorResponse("Failed to retrieve wishlist", 500);
  }
}

// ─── POST /api/user/wishlist — Add item to wishlist ──────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateWishlistItem(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const { productId, variantId } = body;

    await connectDB();

    // ── Verify product exists and is active ──────────────────────────────
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse("Product not found or inactive", 404);
    }

    // If variantId provided, verify it exists
    if (variantId) {
      const variant = product.variants.find(
        (v) => v._id.toString() === variantId
      );
      if (!variant) {
        return errorResponse("Variant not found", 404);
      }
    }

    // ── Upsert wishlist ──────────────────────────────────────────────────
    let wishlist = await Wishlist.findOne({ user: auth.userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: auth.userId,
        items: [{ product: productId, variant: variantId }],
      });
    } else {
      // Check for duplicates
      const exists = wishlist.items.some(
        (item) =>
          item.product.toString() === productId &&
          (variantId
            ? item.variant?.toString() === variantId
            : !item.variant)
      );

      if (exists) {
        return errorResponse("Item already in wishlist", 409);
      }

      if (wishlist.items.length >= 200) {
        return errorResponse("Wishlist cannot have more than 200 items", 400);
      }

      wishlist.items.push({
        product: productId,
        variant: variantId,
      } as never);
    }

    await wishlist.save();

    const populated = await Wishlist.findById(wishlist._id)
      .populate({
        path: "items.product",
        select: "title slug images isActive variants priceRange",
      })
      .lean();

    return successResponse(populated, "Item added to wishlist", 200);
  } catch (err) {
    console.error("POST /api/user/wishlist error:", err);
    return errorResponse("Failed to add item to wishlist", 500);
  }
}
