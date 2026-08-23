import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  loadHomeSale,
  liveCampaignFilter,
  serializePublicCampaign,
} from "@/lib/sales";
import SaleCampaign, { type ISaleCampaignDocument } from "@/models/sale-campaign.model";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = request.nextUrl;
    const view = searchParams.get("view");

    if (view === "home") {
      const home = await loadHomeSale();
      return successResponse(home, "Home sale retrieved");
    }

    if (view === "nav") {
      const campaigns = await SaleCampaign.find({
        ...liveCampaignFilter(),
        showInNav: true,
      })
        .sort({ priority: -1, startsAt: -1 })
        .select("title slug badgeLabel endsAt")
        .limit(2)
        .lean();
      return successResponse({ items: campaigns }, "Live sales retrieved");
    }

    const now = new Date();
    const campaigns = await SaleCampaign.find({
      isActive: true,
      endsAt: { $gt: now },
    })
      .sort({ priority: -1, startsAt: 1 })
      .lean<ISaleCampaignDocument[]>();

    return successResponse(
      {
        items: campaigns.map((campaign) => serializePublicCampaign(campaign)),
      },
      "Sales retrieved"
    );
  } catch (err) {
    console.error("GET /api/sales error:", err);
    return errorResponse("Failed to fetch sales", 500);
  }
}
