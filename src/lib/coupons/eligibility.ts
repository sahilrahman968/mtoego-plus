/**
 * Product / category eligibility for coupon targeting.
 *
 * Rules:
 * - excludedProducts always win
 * - If neither applicableProducts nor applicableCategories is set → all products eligible
 * - Otherwise product must match product list OR its category must match category list
 */

export function isCouponLineEligible(params: {
  productId: string;
  categoryId?: string | null;
  applicableProducts?: Array<string | { toString(): string }> | null;
  applicableCategories?: Array<string | { toString(): string }> | null;
  excludedProducts?: Array<string | { toString(): string }> | null;
}): boolean {
  const productId = params.productId.toString();
  const categoryId = params.categoryId?.toString() || null;

  const excluded = (params.excludedProducts || []).map((id) => id.toString());
  if (excluded.includes(productId)) return false;

  const products = (params.applicableProducts || []).map((id) => id.toString());
  const categories = (params.applicableCategories || []).map((id) => id.toString());

  if (products.length === 0 && categories.length === 0) return true;

  if (products.includes(productId)) return true;
  if (categoryId && categories.includes(categoryId)) return true;

  return false;
}

/**
 * Back-compat helper used by pricing — product-only check.
 * Prefer isCouponLineEligible when category data is available.
 */
export function isCouponProductEligible(
  productId: string,
  applicableProducts?: Array<string | { toString(): string }> | null,
  excludedProducts?: Array<string | { toString(): string }> | null
): boolean {
  return isCouponLineEligible({
    productId,
    applicableProducts,
    excludedProducts,
  });
}
