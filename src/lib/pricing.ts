// ─── India GST Calculation ──────────────────────────────────────────────────
// Default GST rate for e-commerce goods. Adjust per category if needed later.
// Standard rate tiers: 0%, 5%, 12%, 18%, 28%.
// Most consumer goods fall under 18%.

import { GSTBreakdown, ShippingBreakdown } from "@/types";

export const DEFAULT_GST_PERCENT = 18;
const DEFAULT_GST_RATE = DEFAULT_GST_PERCENT / 100;

/**
 * Normalize a GST percentage (0–100) to a decimal rate.
 * Falls back to the default when missing/invalid.
 */
export function normalizeGstPercent(gst?: number | null): number {
  if (typeof gst !== "number" || Number.isNaN(gst)) return DEFAULT_GST_PERCENT;
  return Math.min(100, Math.max(0, gst));
}

/**
 * Price inclusive of GST for a single unit.
 * `price` is assumed exclusive of GST; `gst` is a percentage (0–100).
 */
export function priceInclGst(price: number, gst?: number | null): number {
  const rate = normalizeGstPercent(gst) / 100;
  return round(price * (1 + rate));
}

/**
 * Calculate GST breakdown for a given subtotal.
 *
 * In India, GST is split into:
 * - Intra-state: CGST (half) + SGST (half)
 * - Inter-state: IGST (full amount)
 *
 * Prices are assumed to be exclusive of GST.
 */
export function calculateGST(
  subtotal: number,
  options: {
    gstRate?: number;
    isInterState?: boolean;
  } = {}
): GSTBreakdown {
  const gstRate = options.gstRate ?? DEFAULT_GST_RATE;
  const isInterState = options.isInterState ?? false;

  const totalTax = round(subtotal * gstRate);
  const halfTax = round(totalTax / 2);

  return {
    subtotal: round(subtotal),
    gstRate,
    gstLabel: `${(gstRate * 100).toFixed(0)}%`,
    cgst: isInterState ? 0 : halfTax,
    sgst: isInterState ? 0 : halfTax,
    igst: isInterState ? totalTax : 0,
    isInterState,
    totalTax,
  };
}

/**
 * Build a GST breakdown from a precomputed total tax amount.
 */
function gstFromTotalTax(
  subtotal: number,
  totalTax: number,
  options: { isInterState?: boolean; gstLabel?: string } = {}
): GSTBreakdown {
  const isInterState = options.isInterState ?? false;
  const halfTax = round(totalTax / 2);

  return {
    subtotal: round(subtotal),
    gstRate: subtotal > 0 ? totalTax / subtotal : DEFAULT_GST_RATE,
    gstLabel: options.gstLabel ?? "GST",
    cgst: isInterState ? 0 : halfTax,
    sgst: isInterState ? 0 : halfTax,
    igst: isInterState ? totalTax : 0,
    isInterState,
    totalTax: round(totalTax),
  };
}

// ─── Shipping Calculation (Placeholder) ─────────────────────────────────────
// Replace this with actual carrier API integration later.
// Current logic: free shipping above ₹999, otherwise flat ₹79.

const FREE_SHIPPING_THRESHOLD = 999;
const FLAT_SHIPPING_COST = 79;
const DEFAULT_SHIPPING_METHOD = "Standard Delivery";
const DEFAULT_ESTIMATED_DAYS = 5;

/**
 * Calculate shipping cost based on cart subtotal.
 * This is a placeholder — replace with actual carrier rate APIs.
 */
export function calculateShipping(
  subtotalAfterDiscount: number,
  _options: {
    pincode?: string;
    weight?: number;
  } = {}
): ShippingBreakdown {
  const isFreeShipping = subtotalAfterDiscount >= FREE_SHIPPING_THRESHOLD;

  return {
    method: DEFAULT_SHIPPING_METHOD,
    cost: isFreeShipping ? 0 : FLAT_SHIPPING_COST,
    estimatedDays: DEFAULT_ESTIMATED_DAYS,
    isFreeShipping,
  };
}

// ─── Coupon Discount Calculation ─────────────────────────────────────────────

export {
  isCouponProductEligible,
  isCouponLineEligible,
} from "@/lib/coupons/eligibility";

/**
 * Compute the discount amount for a given coupon and subtotal.
 */
export function calculateDiscount(
  subtotal: number,
  coupon: {
    type: "percentage" | "flat";
    value: number;
    maxDiscount: number | null;
  }
): number {
  let discount = 0;

  if (coupon.type === "percentage") {
    discount = round(subtotal * (coupon.value / 100));
    // Cap at maxDiscount if set
    if (coupon.maxDiscount !== null && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    // Flat discount — cannot exceed subtotal
    discount = Math.min(coupon.value, subtotal);
  }

  return round(discount);
}

// ─── Full Cart Summary ──────────────────────────────────────────────────────

interface CartLineItem {
  price: number;
  quantity: number;
  /** GST percentage (0–100). Defaults to 18 when omitted. */
  gst?: number;
  /**
   * When false, this line is excluded from coupon discount allocation.
   * Defaults to true when omitted.
   */
  couponEligible?: boolean;
}

/**
 * Build a complete cart summary including subtotal, discount, GST, shipping,
 * and grand total.
 *
 * Supports per-line GST rates. Discount is allocated proportionally across
 * coupon-eligible line items before tax is calculated on the taxable value.
 */
export function buildCartSummary(
  items: CartLineItem[],
  coupon?: {
    type: "percentage" | "flat";
    value: number;
    maxDiscount: number | null;
  } | null,
  options?: {
    gstRate?: number;
    isInterState?: boolean;
    pincode?: string;
  }
): {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  gst: GSTBreakdown;
  shipping: ShippingBreakdown;
  grandTotal: number;
  itemCount: number;
} {
  const subtotal = round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  const eligibleSubtotal = round(
    items.reduce((sum, item) => {
      if (item.couponEligible === false) return sum;
      return sum + item.price * item.quantity;
    }, 0)
  );

  const discount = coupon ? calculateDiscount(eligibleSubtotal, coupon) : 0;
  const subtotalAfterDiscount = round(Math.max(0, subtotal - discount));

  // Per-line GST (with proportional discount allocation) when items carry rates.
  // Falls back to a single rate for callers that still pass options.gstRate only.
  const hasPerItemGst = items.some((item) => item.gst !== undefined);
  let gst: GSTBreakdown;

  if (hasPerItemGst && subtotal > 0) {
    let totalTax = 0;
    const rates = new Set<number>();

    for (const item of items) {
      const lineTotal = item.price * item.quantity;
      const lineDiscount =
        discount > 0 && eligibleSubtotal > 0 && item.couponEligible !== false
          ? discount * (lineTotal / eligibleSubtotal)
          : 0;
      const taxable = Math.max(0, lineTotal - lineDiscount);
      const gstPercent = normalizeGstPercent(item.gst);
      rates.add(gstPercent);
      totalTax += taxable * (gstPercent / 100);
    }

    totalTax = round(totalTax);
    const gstLabel =
      rates.size === 1
        ? `${[...rates][0]}%`
        : "Mixed";

    gst = gstFromTotalTax(subtotalAfterDiscount, totalTax, {
      isInterState: options?.isInterState,
      gstLabel,
    });
  } else {
    gst = calculateGST(subtotalAfterDiscount, {
      gstRate: options?.gstRate,
      isInterState: options?.isInterState,
    });
  }

  const shipping = calculateShipping(subtotalAfterDiscount, {
    pincode: options?.pincode,
  });

  const grandTotal = round(subtotalAfterDiscount + gst.totalTax + shipping.cost);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    subtotal,
    discount,
    subtotalAfterDiscount,
    gst,
    shipping,
    grandTotal,
    itemCount,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Round to 2 decimal places (paise precision) */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}
