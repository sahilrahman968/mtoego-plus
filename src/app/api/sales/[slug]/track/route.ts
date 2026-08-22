import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { isValidSlug } from "@/lib/validators";
import { bumpSaleStat, campaignStatus } from "@/lib/sales";
import SaleCampaign from "@/models/sale-campaign.model";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    if (!isValidSlug(slug)) {
      return errorResponse("Invalid sale URL", 400);
    }

    let event = "view";
    try {
      const body = await request.json();
      if (body?.event === "click") event = "click";
    } catch {
      // default view
    }

    await connectDB();
    const campaign = await SaleCampaign.findOne({ slug }).select("_id isActive startsAt endsAt");
    if (!campaign || campaignStatus(campaign) === "paused") {
      return errorResponse("Sale not found", 404);
    }

    if (event === "view") {
      await bumpSaleStat(campaign._id.toString(), "views");
    }

    return successResponse(null, "Tracked");
  } catch (err) {
    console.error("POST /api/sales/:slug/track error:", err);
    return errorResponse("Failed to track sale", 500);
  }
}
