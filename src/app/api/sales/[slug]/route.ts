import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidSlug } from "@/lib/validators";
import { loadPublicSaleBySlug } from "@/lib/sales";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!isValidSlug(slug)) {
      return errorResponse("Invalid sale URL", 400);
    }

    await connectDB();
    const result = await loadPublicSaleBySlug(slug);

    if ("error" in result) {
      if (result.error === "not_found") {
        return errorResponse("Sale not found", 404);
      }
      return errorResponse("This sale is not available", 404);
    }

    return successResponse(result);
  } catch (err) {
    console.error("GET /api/sales/:slug error:", err);
    return errorResponse("Failed to fetch sale", 500);
  }
}
