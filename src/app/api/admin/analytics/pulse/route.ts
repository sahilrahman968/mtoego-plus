import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import { withDelta, round2 } from "@/lib/analytics/format";
import {
  getOrderTotalsForWindows,
  paymentSuccessRate,
  cancelRate,
  refundRate,
} from "@/lib/analytics/orders";
import { getAbandonedCartSummary } from "@/lib/analytics/cart-wishlist";
import {
  getProductActiveCounts,
  getLowStockCount,
} from "@/lib/analytics/products";
import { getOpenCallbackCount } from "@/lib/analytics/callbacks";

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
      { current, previous },
      abandoned,
      productCounts,
      lowStockCount,
      openCallbacks,
    ] = await Promise.all([
      getOrderTotalsForWindows(window),
      getAbandonedCartSummary(),
      getProductActiveCounts(),
      getLowStockCount(),
      getOpenCallbackCount(),
    ]);

    const paySuccess = paymentSuccessRate(current);
    const paySuccessPrev = paymentSuccessRate(previous);

    return successResponse({
      period: window.period,
      label: window.label,
      metrics: {
        revenue: withDelta(current.revenue, previous.revenue),
        orders: withDelta(current.orders, previous.orders),
        aov: withDelta(current.aov, previous.aov),
        paymentSuccessPct: withDelta(paySuccess, paySuccessPrev),
        discount: withDelta(current.discount, previous.discount),
        netAfterDiscount: withDelta(
          current.subtotalAfterDiscount,
          previous.subtotalAfterDiscount
        ),
        pendingRevenue: {
          value: round2(current.pendingRevenue),
          count: current.pendingCount,
        },
        cancelRatePct: withDelta(cancelRate(current), cancelRate(previous)),
        cancelled: {
          count: current.cancelledCount,
          revenue: round2(current.cancelledRevenue),
        },
        refundRatePct: withDelta(refundRate(current), refundRate(previous)),
        refunded: {
          count: current.refundedCount,
          revenue: round2(current.refundedRevenue),
        },
        abandonedCart: abandoned,
        lowStockCount,
        openCallbacks,
        products: productCounts,
      },
    });
  } catch (err) {
    console.error("[Analytics Pulse] Error:", err);
    return errorResponse("Failed to fetch pulse analytics");
  }
}
