import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { connectDB } from "@/lib/db/mongoose";
import { getPeriodWindowFromSearchParams } from "@/lib/analytics/periods";
import {
  getDailyOrderSeries,
  getOrdersByStatus,
  getWeeklyPaymentSuccess,
  getMonthlyRevenue,
} from "@/lib/analytics/orders";
import { getAbandonmentAgeBuckets } from "@/lib/analytics/cart-wishlist";

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

    const [daily, ordersByStatus, weeklyPayment, abandonmentAge, monthlyRevenue] =
      await Promise.all([
        getDailyOrderSeries(window),
        getOrdersByStatus(window.start, window.end),
        getWeeklyPaymentSuccess(window),
        getAbandonmentAgeBuckets(),
        getMonthlyRevenue(11),
      ]);

    return successResponse({
      period: window.period,
      label: window.label,
      daily,
      ordersByStatus,
      weeklyPayment,
      abandonmentAge,
      monthlyRevenue,
    });
  } catch (err) {
    console.error("[Analytics Curves] Error:", err);
    return errorResponse("Failed to fetch curve analytics");
  }
}
