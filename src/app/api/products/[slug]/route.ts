import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { connectDB } from "@/lib/db/mongoose";
import { isValidSlug } from "@/lib/validators";
import Product from "@/models/product.model";

type RouteParams = { params: Promise<{ slug: string }> };

// ─── GET /api/products/:slug — Public product detail by slug ────────────────
// Only returns active products.

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!isValidSlug(slug)) {
      return errorResponse("Invalid product slug", 400);
    }

    await connectDB();

    const product = await Product.findOne({ slug, isActive: true })
      .populate("category", "name slug")
      .populate({
        path: "relatedProducts",
        match: { isActive: true },
        select: "title slug images variants category tags isFeatured createdAt",
        populate: { path: "category", select: "name slug" },
      })
      .lean();

    if (!product) {
      return errorResponse("Product not found", 404);
    }

    const { applySaleToProduct, applySaleToProducts, loadLiveSaleIndex } = await import(
      "@/lib/sales"
    );
    const saleIndex = await loadLiveSaleIndex();

    const relatedRaw = (
      Array.isArray(product.relatedProducts) ? product.relatedProducts : []
    ).filter(
      (item) => item && typeof item === "object" && "title" in item && "variants" in item
    );

    const relatedProducts = applySaleToProducts(relatedRaw as never[], saleIndex);

    return successResponse(
      applySaleToProduct(
        {
          ...product,
          relatedProducts,
          relatedProductsHeading:
            product.relatedProductsHeading?.trim() || "Related products",
        } as never,
        saleIndex
      )
    );
  } catch (err) {
    console.error("[Products] Public get error:", err);
    return errorResponse("Failed to fetch product", 500);
  }
}
