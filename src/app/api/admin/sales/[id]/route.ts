import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId, validateUpdateSale } from "@/lib/validators";
import { isBannerCtaPosition } from "@/lib/banner-cta";
import { campaignStatus } from "@/lib/sales";
import SaleCampaign from "@/models/sale-campaign.model";
import Product from "@/models/product.model";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(_request, "sales.view");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid sale ID", 400);
    }

    await connectDB();

    const campaign = await SaleCampaign.findById(id)
      .populate({
        path: "items.product",
        select: "title slug images variants isActive",
      })
      .lean();

    if (!campaign) {
      return errorResponse("Sale not found", 404);
    }

    return successResponse(
      { ...campaign, status: campaignStatus(campaign) },
      "Sale retrieved"
    );
  } catch (err) {
    console.error("GET /api/admin/sales/:id error:", err);
    return errorResponse("Failed to retrieve sale", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(request, "sales.update");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid sale ID", 400);
    }

    const body = await request.json();
    const validation = validateUpdateSale(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    await connectDB();

    const campaign = await SaleCampaign.findById(id);
    if (!campaign) {
      return errorResponse("Sale not found", 404);
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.slug !== undefined) updates.slug = String(body.slug).trim().toLowerCase();
    if (body.subtitle !== undefined) updates.subtitle = String(body.subtitle).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.badgeLabel !== undefined) {
      updates.badgeLabel = String(body.badgeLabel).trim().toUpperCase() || "SALE";
    }
    if (body.homeHeadline !== undefined) {
      updates.homeHeadline = String(body.homeHeadline).trim() || "Flash Cut";
    }
    if (body.bannerCtaLabel !== undefined) {
      updates.bannerCtaLabel = String(body.bannerCtaLabel).trim() || "Shop The Sale";
    }
    if (body.bannerCtaHref !== undefined) {
      updates.bannerCtaHref = String(body.bannerCtaHref).trim();
    }
    if (body.bannerCtaPosition !== undefined) {
      updates.bannerCtaPosition = isBannerCtaPosition(body.bannerCtaPosition)
        ? body.bannerCtaPosition
        : "bottom-left";
    }
    if (body.seoTitle !== undefined) updates.seoTitle = String(body.seoTitle).trim();
    if (body.seoDescription !== undefined) {
      updates.seoDescription = String(body.seoDescription).trim();
    }
    if (body.banner !== undefined) updates.banner = body.banner;
    if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) updates.endsAt = new Date(body.endsAt);
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.showOnHome !== undefined) updates.showOnHome = body.showOnHome;
    if (body.showInNav !== undefined) updates.showInNav = body.showInNav;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.homeLimit !== undefined) updates.homeLimit = body.homeLimit;
    if (body.allowCoupons !== undefined) updates.allowCoupons = body.allowCoupons;
    if (body.defaultDiscountType !== undefined) {
      updates.defaultDiscountType = body.defaultDiscountType;
    }
    if (body.defaultDiscountValue !== undefined) {
      updates.defaultDiscountValue = body.defaultDiscountValue;
    }
    if (body.items !== undefined) {
      const productIds = body.items.map((item: { product: string }) => item.product);
      const found = await Product.countDocuments({ _id: { $in: productIds } });
      if (found !== productIds.length) {
        return errorResponse("One or more selected products were not found", 400);
      }
      updates.items = body.items;
    }

    if (updates.slug && updates.slug !== campaign.slug) {
      const existing = await SaleCampaign.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });
      if (existing) {
        return errorResponse("A sale with this URL already exists", 409);
      }
    }

    Object.assign(campaign, updates);
    await campaign.save();

    return successResponse(campaign.toJSON(), "Sale updated");
  } catch (err) {
    console.error("PUT /api/admin/sales/:id error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A sale with this URL already exists", 409);
    }
    return errorResponse("Failed to update sale", 500);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(_request, "sales.delete");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid sale ID", 400);
    }

    await connectDB();

    const campaign = await SaleCampaign.findByIdAndDelete(id);
    if (!campaign) {
      return errorResponse("Sale not found", 404);
    }

    return successResponse(null, "Sale deleted");
  } catch (err) {
    console.error("DELETE /api/admin/sales/:id error:", err);
    return errorResponse("Failed to delete sale", 500);
  }
}
