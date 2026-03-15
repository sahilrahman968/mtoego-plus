import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { isValidObjectId } from "@/lib/validators";
import Product from "@/models/product.model";

type RouteParams = { params: Promise<{ id: string }> };

// ─── PUT /api/admin/products/:id/inventory — Update stock levels ────────────
// Allows admin to set or adjust stock for specific variants.
//
// Body:
//   {
//     "updates": [
//       { "variantId": "...", "stock": 50 },           // set absolute stock
//       { "variantId": "...", "adjustment": -5 }        // relative adjustment
//     ]
//   }

interface StockUpdate {
  variantId: string;
  stock?: number;
  adjustment?: number;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const body = await request.json();
    const updates: StockUpdate[] = body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return errorResponse("Updates array is required and must not be empty", 400);
    }

    // Validate each update
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      if (!u.variantId || !isValidObjectId(u.variantId)) {
        return errorResponse(`Update ${i}: variantId is required and must be a valid ID`, 400);
      }
      if (u.stock === undefined && u.adjustment === undefined) {
        return errorResponse(`Update ${i}: Either "stock" or "adjustment" is required`, 400);
      }
      if (u.stock !== undefined && (typeof u.stock !== "number" || u.stock < 0)) {
        return errorResponse(`Update ${i}: stock must be a non-negative number`, 400);
      }
      if (u.adjustment !== undefined && typeof u.adjustment !== "number") {
        return errorResponse(`Update ${i}: adjustment must be a number`, 400);
      }
    }

    const product = await Product.findById(id);
    if (!product) {
      return errorResponse("Product not found", 404);
    }

    // Apply updates
    const results: { variantId: string; sku: string; previousStock: number; newStock: number }[] = [];

    for (const update of updates) {
      const variant = product.variants.find(
        (v) => v._id.toString() === update.variantId
      );

      if (!variant) {
        return errorResponse(
          `Variant "${update.variantId}" not found on this product`,
          404
        );
      }

      const previousStock = variant.stock;

      if (update.stock !== undefined) {
        // Absolute set
        variant.stock = update.stock;
      } else if (update.adjustment !== undefined) {
        // Relative adjustment
        const newStock = variant.stock + update.adjustment;
        if (newStock < 0) {
          return errorResponse(
            `Variant "${variant.sku}": adjustment would result in negative stock (${variant.stock} + ${update.adjustment} = ${newStock})`,
            400
          );
        }
        variant.stock = newStock;
      }

      results.push({
        variantId: update.variantId,
        sku: variant.sku,
        previousStock,
        newStock: variant.stock,
      });
    }

    await product.save();

    const populated = await Product.findById(id)
      .populate("category", "name slug")
      .lean();

    return successResponse(
      { product: populated, stockChanges: results },
      "Inventory updated successfully"
    );
  } catch (err) {
    console.error("[Inventory] Update error:", err);
    return errorResponse("Failed to update inventory", 500);
  }
}

// ─── GET /api/admin/products/:id/inventory — Get stock overview ─────────────

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const { id } = await params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid product ID", 400);
    }

    await connectDB();

    const product = await Product.findById(id)
      .select("title slug variants")
      .lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const inventory = product.variants.map((v) => ({
      variantId: v._id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      stock: v.stock,
      isActive: v.isActive,
    }));

    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    const lowStockVariants = product.variants.filter((v) => v.stock > 0 && v.stock <= 5);
    const outOfStockVariants = product.variants.filter((v) => v.stock === 0);

    return successResponse({
      productId: product._id,
      title: product.title,
      slug: product.slug,
      totalStock,
      lowStockCount: lowStockVariants.length,
      outOfStockCount: outOfStockVariants.length,
      variants: inventory,
    });
  } catch (err) {
    console.error("[Inventory] Get error:", err);
    return errorResponse("Failed to fetch inventory", 500);
  }
}
