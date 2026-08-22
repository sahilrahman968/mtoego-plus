import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { isValidObjectId } from "@/lib/validators";
import SaleCampaign from "@/models/sale-campaign.model";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requirePermission(_request, "sales.create");
    if (auth.error) return auth.error;

    const { id } = await context.params;
    if (!isValidObjectId(id)) {
      return errorResponse("Invalid sale ID", 400);
    }

    await connectDB();

    const source = await SaleCampaign.findById(id).lean();
    if (!source) {
      return errorResponse("Sale not found", 404);
    }

    let slug = `${source.slug}-copy`;
    let n = 2;
    while (await SaleCampaign.exists({ slug })) {
      slug = `${source.slug}-copy-${n}`;
      n += 1;
    }

    const copy = await SaleCampaign.create({
      title: `${source.title} (copy)`,
      slug,
      subtitle: source.subtitle,
      description: source.description,
      badgeLabel: source.badgeLabel,
      homeHeadline: source.homeHeadline,
      seoTitle: source.seoTitle,
      seoDescription: source.seoDescription,
      banner: source.banner,
      startsAt: source.startsAt,
      endsAt: source.endsAt,
      isActive: false,
      showOnHome: source.showOnHome,
      showInNav: source.showInNav,
      priority: source.priority,
      homeLimit: source.homeLimit,
      allowCoupons: source.allowCoupons,
      defaultDiscountType: source.defaultDiscountType,
      defaultDiscountValue: source.defaultDiscountValue,
      items: source.items,
    });

    return successResponse(copy.toJSON(), "Sale duplicated", 201);
  } catch (err) {
    console.error("POST /api/admin/sales/:id/duplicate error:", err);
    return errorResponse("Failed to duplicate sale", 500);
  }
}
