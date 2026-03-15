// ─── India GST Calculation ──────────────────────────────────────────────────
// Default GST rate for e-commerce goods. Adjust per category if needed later.
// Standard rate tiers: 0%, 5%, 12%, 18%, 28%.
// Most consumer goods fall under 18%.

import { GSTBreakdown, ShippingBreakdown } from "@/types";

const DEFAULT_GST_RATE = 0.18; // 18%

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
}

/**
 * Build a complete cart summary including subtotal, discount, GST, shipping,
 * and grand total.
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

  const discount = coupon ? calculateDiscount(subtotal, coupon) : 0;
  const subtotalAfterDiscount = round(Math.max(0, subtotal - discount));

  const gst = calculateGST(subtotalAfterDiscount, {
    gstRate: options?.gstRate,
    isInterState: options?.isInterState,
  });

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
