import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import {
  getSaleCollectionProducts,
  isSaleCollectionKey,
  listSaleProductCollections,
} from "@/lib/sale-product-collections";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, ["coupons.create", "coupons.update"]);
    if (auth.error) return auth.error;

    await connectDB();

    const collection = request.nextUrl.searchParams.get("collection")?.trim();
    if (!collection) {
      const catalog = await listSaleProductCollections();
      return successResponse(catalog);
    }

    if (collection === "category") {
      const categoryId = request.nextUrl.searchParams.get("categoryId")?.trim();
      const data = await getSaleCollectionProducts({
        collection: "category",
        categoryId,
      });
      return successResponse(data);
    }

    if (!isSaleCollectionKey(collection)) {
      return errorResponse("Unknown product collection", 400);
    }

    const data = await getSaleCollectionProducts({ collection });
    return successResponse(data);
  } catch (err) {
    console.error("[Coupons] Product collections error:", err);
    return errorResponse("Failed to load product collections", 500);
  }
}
