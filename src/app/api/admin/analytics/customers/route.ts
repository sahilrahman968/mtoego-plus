import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import {
  getCustomerHealth,
  getSignupToPurchase,
  getLtvBands,
  getOneAndDone,
  getNeverOrdered,
  getSignupChannelMix,
  getCohortRetention,
  getCustomersByLocation,
  getTopRevenueCustomers,
} from "@/lib/analytics/customers";
import { getCallbackPipeline } from "@/lib/analytics/callbacks";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "analytics.customers");
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
      health,
      signupToPurchase,
      ltvBands,
      topDecile,
      oneAndDone,
      neverOrdered,
      signupChannels,
      customersByLocation,
      cohorts,
      callbacks,
    ] = await Promise.all([
      getCustomerHealth(window),
      getSignupToPurchase(),
      getLtvBands(),
      getTopRevenueCustomers(),
      getOneAndDone(),
      getNeverOrdered(),
      getSignupChannelMix(),
      getCustomersByLocation(),
      getCohortRetention(6),
      getCallbackPipeline(),
    ]);

    return successResponse({
      period: window.period,
      label: window.label,
      health,
      newVsReturning: {
        newCustomers: health.newCustomers,
        returningCustomers: health.returningCustomers,
      },
      signupToPurchase,
      ltvBands,
      topDecile,
      oneAndDone,
      neverOrdered,
      signupChannels,
      customersByLocation,
      cohorts,
      callbacks,
    });
  } catch (err) {
    console.error("[Analytics Customers] Error:", err);
    return errorResponse("Failed to fetch customer analytics");
  }
}
