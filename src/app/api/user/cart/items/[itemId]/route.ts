import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateCartItemUpdate, isValidObjectId } from "@/lib/validators";
import Cart from "@/models/cart.model";
import Product from "@/models/product.model";

type RouteContext = { params: Promise<{ itemId: string }> };

// ─── PUT /api/user/cart/items/:itemId — Update item quantity ─────────────────

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { itemId } = await context.params;
    if (!isValidObjectId(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    const body = await request.json();
    const validation = validateCartItemUpdate(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const { quantity } = body;

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      return errorResponse("Cart not found", 404);
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex < 0) {
      return errorResponse("Item not found in cart", 404);
    }

    const cartItem = cart.items[itemIndex];

    // ── Stock validation ─────────────────────────────────────────────────
    const product = await Product.findById(cartItem.product);
    if (!product || !product.isActive) {
      // Remove stale item
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return errorResponse("Product no longer available — removed from cart", 400);
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === cartItem.variant.toString() && v.isActive
    );
    if (!variant) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return errorResponse("Variant no longer available — removed from cart", 400);
    }

    if (quantity > variant.stock) {
      return errorResponse(
        `Insufficient stock. Only ${variant.stock} unit(s) available`,
        400
      );
    }

    // ── Update quantity & refresh price snapshot ──────────────────────────
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].priceAtAdd = variant.price;
    await cart.save();

    const populated = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "title slug images isActive variants",
      })
      .populate({
        path: "coupon",
        select: "code type value maxDiscount minOrderValue expiresAt isActive",
      })
      .lean();

    return successResponse(populated, "Cart item updated");
  } catch (err) {
    console.error("PUT /api/user/cart/items/:itemId error:", err);
    return errorResponse("Failed to update cart item", 500);
  }
}

// ─── DELETE /api/user/cart/items/:itemId — Remove single item ────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const { itemId } = await context.params;
    if (!isValidObjectId(itemId)) {
      return errorResponse("Invalid item ID", 400);
    }

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId });
    if (!cart) {
      return errorResponse("Cart not found", 404);
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );
    if (itemIndex < 0) {
      return errorResponse("Item not found in cart", 404);
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const populated = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "title slug images isActive variants",
      })
      .populate({
        path: "coupon",
        select: "code type value maxDiscount minOrderValue expiresAt isActive",
      })
      .lean();

    return successResponse(populated, "Item removed from cart");
  } catch (err) {
    console.error("DELETE /api/user/cart/items/:itemId error:", err);
    return errorResponse("Failed to remove cart item", 500);
  }
}
