import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requirePermission } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import {
  getFulfillmentSla,
  getStuckOrders,
  getCancelReasonBreakdown,
  getCouponPerformance,
  getPaymentMethodMix,
  getGeoRevenue,
  getOrderTotalsForWindows,
  cancelRate,
  refundRate,
} from "@/lib/analytics/orders";
import { getReviewSummary, getLowRatedProducts } from "@/lib/analytics/reviews";
import { round2 } from "@/lib/analytics/format";

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "analytics.trust");
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
      sla,
      stuckOrders,
      cancelReasons,
      coupons,
      paymentMethods,
      geo,
      reviewSummary,
      lowRatedProducts,
      { current },
    ] = await Promise.all([
      getFulfillmentSla(window),
      getStuckOrders(),
      getCancelReasonBreakdown(window),
      getCouponPerformance(window),
      getPaymentMethodMix(window),
      getGeoRevenue(window),
      getReviewSummary(window),
      getLowRatedProducts(),
      getOrderTotalsForWindows(window),
    ]);

    return successResponse({
      period: window.period,
      label: window.label,
      sla,
      stuckOrders,
      cancels: {
        count: current.cancelledCount,
        revenue: round2(current.cancelledRevenue),
        ratePct: round2(cancelRate(current)),
        reasons: cancelReasons,
      },
      refunds: {
        count: current.refundedCount,
        revenue: round2(current.refundedRevenue),
        ratePct: round2(refundRate(current)),
      },
      coupons,
      paymentMethods,
      geo,
      reviews: {
        ...reviewSummary,
        lowRatedProducts,
      },
    });
  } catch (err) {
    console.error("[Analytics Trust] Error:", err);
    return errorResponse("Failed to fetch trust analytics");
  }
}
