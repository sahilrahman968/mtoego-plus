import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import {
  getNewVsReturning,
  getSignupToPurchase,
  getLtvBands,
  getVipList,
  getOneAndDone,
  getNeverOrdered,
  getSignupChannelMix,
  getCohortRetention,
} from "@/lib/analytics/customers";
import { getCallbackPipeline } from "@/lib/analytics/callbacks";

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

    const [
      newVsReturning,
      signupToPurchase,
      ltvBands,
      vipList,
      oneAndDone,
      neverOrdered,
      signupChannels,
      cohorts,
      callbacks,
    ] = await Promise.all([
      getNewVsReturning(window),
      getSignupToPurchase(),
      getLtvBands(),
      getVipList(),
      getOneAndDone(),
      getNeverOrdered(),
      getSignupChannelMix(),
      getCohortRetention(6),
      getCallbackPipeline(),
    ]);

    return successResponse({
      period: window.period,
      label: window.label,
      newVsReturning,
      signupToPurchase,
      ltvBands,
      vipList,
      oneAndDone,
      neverOrdered,
      signupChannels,
      cohorts,
      callbacks,
    });
  } catch (err) {
    console.error("[Analytics Customers] Error:", err);
    return errorResponse("Failed to fetch customer analytics");
  }
}
