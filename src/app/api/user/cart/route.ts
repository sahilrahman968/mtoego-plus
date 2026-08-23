import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { validateCartItem } from "@/lib/validators";
import Cart from "@/models/cart.model";
import Product from "@/models/product.model";
import "@/models/coupon.model";

// ─── GET /api/user/cart — Get the current user's cart ────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    await connectDB();

    const cart = await Cart.findOne({ user: auth.userId })
      .populate({
        path: "items.product",
        select: "title slug images isActive variants category",
      })
      .populate({
        path: "coupon",
        select:
          "code name type value maxDiscount minOrderValue startsAt expiresAt status isActive customerDescription applicableProducts applicableCategories excludedProducts firstOrderOnly",
      })
      .lean();

    if (!cart) {
      return successResponse({ items: [], coupon: null }, "Cart is empty");
    }

    const { applySaleToProduct, loadLiveSaleIndex } = await import("@/lib/sales");
    const saleIndex = await loadLiveSaleIndex();
    const items = (cart.items || []).map((item) => {
      const product = item.product as unknown;
      if (product && typeof product === "object" && "_id" in (product as object)) {
        return {
          ...item,
          product: applySaleToProduct(product as never, saleIndex),
        };
      }
      return item;
    });

    return successResponse({ ...cart, items }, "Cart retrieved");
  } catch (err) {
    console.error("GET /api/user/cart error:", err);
    return errorResponse("Failed to retrieve cart", 500);
  }
}

// ─── POST /api/user/cart — Add item to cart (with stock validation) ──────────

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateCartItem(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    const { productId, variantId, quantity } = body;

    await connectDB();

    // ── Verify product & variant exist and are active ────────────────────
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return errorResponse("Product not found or inactive", 404);
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === variantId && v.isActive
    );
    if (!variant) {
      return errorResponse("Variant not found or inactive", 404);
    }

    // ── Stock validation ─────────────────────────────────────────────────
    if (variant.stock < quantity) {
      return errorResponse(
        `Insufficient stock. Only ${variant.stock} unit(s) available`,
        400
      );
    }

    const { applySaleToProduct, bumpSaleStat, loadLiveSaleIndex, resolveUnitPrice } = await import("@/lib/sales");
    const saleIndex = await loadLiveSaleIndex();
    const priced = resolveUnitPrice(saleIndex, productId, variant.price);

    // ── Upsert cart & item ───────────────────────────────────────────────
    let cart = await Cart.findOne({ user: auth.userId });

    if (!cart) {
      cart = new Cart({
        user: auth.userId,
        items: [
          {
            product: productId,
            variant: variantId,
            quantity,
            priceAtAdd: priced.price,
          },
        ],
      });
    } else {
      // Check if item already exists
      const existingIndex = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          item.variant.toString() === variantId
      );

      if (existingIndex >= 0) {
        const newQty = cart.items[existingIndex].quantity + quantity;
        if (newQty > variant.stock) {
          return errorResponse(
            `Cannot add ${quantity} more. Only ${variant.stock - cart.items[existingIndex].quantity} additional unit(s) available`,
            400
          );
        }
        if (newQty > 50) {
          return errorResponse("Quantity cannot exceed 50 per item", 400);
        }
        cart.items[existingIndex].quantity = newQty;
        cart.items[existingIndex].priceAtAdd = priced.price;
      } else {
        if (cart.items.length >= 100) {
          return errorResponse("Cart cannot have more than 100 items", 400);
        }
        cart.items.push({
          product: productId,
          variant: variantId,
          quantity,
          priceAtAdd: priced.price,
        } as never);
      }
    }

    await cart.save();

    if (priced.offer) {
      void bumpSaleStat(priced.offer.campaign.id, "addToCarts");
    }

    const populated = await Cart.findById(cart._id)
      .populate({
        path: "items.product",
        select: "title slug images isActive variants category",
      })
      .populate({
        path: "coupon",
        select:
          "code name type value maxDiscount minOrderValue startsAt expiresAt status isActive customerDescription applicableProducts applicableCategories excludedProducts firstOrderOnly",
      })
      .lean();

    const items = (populated?.items || []).map((item) => {
      const product = item.product as unknown;
      if (product && typeof product === "object" && "_id" in (product as object)) {
        return {
          ...item,
          product: applySaleToProduct(product as never, saleIndex),
        };
      }
      return item;
    });

    return successResponse(
      populated ? { ...populated, items } : populated,
      "Item added to cart",
      200
    );
  } catch (err) {
    console.error("POST /api/user/cart error:", err);
    return errorResponse("Failed to add item to cart", 500);
  }
}

// ─── DELETE /api/user/cart — Clear entire cart ───────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;

    await connectDB();

    await Cart.findOneAndDelete({ user: auth.userId });

    return successResponse(null, "Cart cleared");
  } catch (err) {
    console.error("DELETE /api/user/cart error:", err);
    return errorResponse("Failed to clear cart", 500);
  }
}
