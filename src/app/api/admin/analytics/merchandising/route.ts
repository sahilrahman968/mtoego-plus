import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import {
  getTopProducts,
  getTopCategories,
  getUnitsSoldByProduct,
} from "@/lib/analytics/orders";
import {
  getHighWishlistLowSales,
  getAbandonedCartsToRecover,
  getTopAbandonedProducts,
  getPriceDriftCarts,
  getWishlistPurchaseOverlap,
} from "@/lib/analytics/cart-wishlist";
import {
  getLowStockBestsellers,
  getDeadStock,
} from "@/lib/analytics/products";

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();

    let window;
    try {
      window = getPeriodWindowFromSearchParams(request.nextUrl.searchParams);
    } catch (e) {
      return errorResponse(
        e instanceof Error ? e.message : "Invalid period",
        400
      );
    }

    const salesByProduct = await getUnitsSoldByProduct(window);

    const [
      topProducts,
      topCategories,
      highWishlistLowSales,
      abandonedCarts,
      topAbandonedProducts,
      lowStockBestsellers,
      deadStock,
      priceDriftCarts,
      wishlistOverlap,
    ] = await Promise.all([
      getTopProducts(window),
      getTopCategories(window),
      getHighWishlistLowSales(salesByProduct),
      getAbandonedCartsToRecover(),
      getTopAbandonedProducts(),
      getLowStockBestsellers(window),
      getDeadStock(),
      getPriceDriftCarts(),
      getWishlistPurchaseOverlap(window),
    ]);

    return successResponse({
      period: window.period,
      label: window.label,
      topProducts,
      topCategories,
      highWishlistLowSales,
      abandonedCarts,
      topAbandonedProducts,
      lowStockBestsellers,
      deadStock,
      priceDriftCarts,
      wishlistOverlap,
    });
  } catch (err) {
    console.error("[Analytics Merchandising] Error:", err);
    return errorResponse("Failed to fetch merchandising analytics");
  }
}
