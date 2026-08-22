import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { validateCreateSale } from "@/lib/validators";
import { isBannerCtaPosition } from "@/lib/banner-cta";
import { campaignStatus } from "@/lib/sales";
import SaleCampaign from "@/models/sale-campaign.model";
import Product from "@/models/product.model";

function mapSaleBody(body: Record<string, unknown>) {
  return {
    title: typeof body.title === "string" ? body.title.trim() : undefined,
    slug:
      typeof body.slug === "string"
        ? body.slug.trim().toLowerCase()
        : undefined,
    subtitle:
      typeof body.subtitle === "string" ? body.subtitle.trim() : undefined,
    description:
      typeof body.description === "string" ? body.description.trim() : undefined,
    badgeLabel:
      typeof body.badgeLabel === "string" && body.badgeLabel.trim()
        ? body.badgeLabel.trim().toUpperCase()
        : "SALE",
    homeHeadline:
      typeof body.homeHeadline === "string" && body.homeHeadline.trim()
        ? body.homeHeadline.trim()
        : "Flash Cut",
    bannerCtaLabel:
      typeof body.bannerCtaLabel === "string" && body.bannerCtaLabel.trim()
        ? body.bannerCtaLabel.trim()
        : "Shop The Sale",
    bannerCtaHref:
      typeof body.bannerCtaHref === "string" ? body.bannerCtaHref.trim() : undefined,
    bannerCtaPosition: isBannerCtaPosition(body.bannerCtaPosition)
      ? body.bannerCtaPosition
      : "bottom-left",
    seoTitle: typeof body.seoTitle === "string" ? body.seoTitle.trim() : undefined,
    seoDescription:
      typeof body.seoDescription === "string"
        ? body.seoDescription.trim()
        : undefined,
    banner: body.banner ?? undefined,
    startsAt: body.startsAt ? new Date(String(body.startsAt)) : undefined,
    endsAt: body.endsAt ? new Date(String(body.endsAt)) : undefined,
    isActive: body.isActive ?? true,
    showOnHome: body.showOnHome ?? true,
    showInNav: body.showInNav ?? true,
    priority: typeof body.priority === "number" ? body.priority : 0,
    homeLimit: typeof body.homeLimit === "number" ? body.homeLimit : 5,
    allowCoupons: body.allowCoupons ?? true,
    defaultDiscountType: body.defaultDiscountType ?? "percentage",
    defaultDiscountValue: body.defaultDiscountValue ?? 20,
    items: Array.isArray(body.items)
      ? body.items.map((raw) => {
          const item = raw as Record<string, unknown>;
          return {
            product: item.product,
            discountType: item.discountType,
            value: item.value,
          };
        })
      : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "sales.list");
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");

    await connectDB();

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const now = new Date();
    if (status === "paused") filter.isActive = false;
    if (status === "scheduled") {
      filter.isActive = true;
      filter.startsAt = { $gt: now };
    }
    if (status === "live") {
      filter.isActive = true;
      filter.startsAt = { $lte: now };
      filter.endsAt = { $gt: now };
    }
    if (status === "ended") {
      filter.isActive = true;
      filter.endsAt = { $lte: now };
    }

    const [campaigns, total] = await Promise.all([
      SaleCampaign.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SaleCampaign.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return successResponse(
      {
        items: campaigns.map((campaign) => ({
          ...campaign,
          status: campaignStatus(campaign),
          itemCount: campaign.items?.length || 0,
        })),
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      "Sales retrieved"
    );
  } catch (err) {
    console.error("GET /api/admin/sales error:", err);
    return errorResponse("Failed to retrieve sales", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "sales.create");
    if (auth.error) return auth.error;

    const body = await request.json();
    const validation = validateCreateSale(body);
    if (!validation.valid) {
      return errorResponse("Validation failed", 400, validation.errors.join("; "));
    }

    await connectDB();

    const slug = String(body.slug).trim().toLowerCase();
    const existing = await SaleCampaign.findOne({ slug });
    if (existing) {
      return errorResponse("A sale with this URL already exists", 409);
    }

    const productIds = body.items.map((item: { product: string }) => item.product);
    const found = await Product.countDocuments({ _id: { $in: productIds } });
    if (found !== productIds.length) {
      return errorResponse("One or more selected products were not found", 400);
    }

    const campaign = await SaleCampaign.create(mapSaleBody(body));
    return successResponse(campaign.toJSON(), "Sale created", 201);
  } catch (err) {
    console.error("POST /api/admin/sales error:", err);
    if (err instanceof Error && err.message.includes("duplicate key")) {
      return errorResponse("A sale with this URL already exists", 409);
    }
    return errorResponse("Failed to create sale", 500);
  }
}
