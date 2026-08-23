// ─── Simple Input Validators ────────────────────────────────────────────────
// Lightweight validation without pulling in a heavy schema library.
// Swap out with zod / yup later if the project grows.

import { isBannerCtaPosition } from "@/lib/banner-cta";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isStrongPassword(password: string): boolean {
  // At least 8 chars, 1 uppercase, 1 lowercase, 1 digit
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

export function sanitize(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// ─── Slug Validator ─────────────────────────────────────────────────────────

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

// ─── SKU Validator ──────────────────────────────────────────────────────────

export function isValidSKU(sku: string): boolean {
  return /^[A-Z0-9-]+$/.test(sku.toUpperCase());
}

// ─── MongoDB ObjectId Validator ─────────────────────────────────────────────

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// ─── Product Validators ─────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

type ColorEntry = { color?: unknown };

/**
 * Every color used by a variant must have a tagged image, and every tagged
 * image color must be represented by a variant.
 */
export function validateProductColorImages(
  variants: ColorEntry[],
  images: ColorEntry[]
): string[] {
  const variantColors = new Set(
    variants
      .map((variant) =>
        typeof variant.color === "string" ? variant.color.trim() : ""
      )
      .filter(Boolean)
  );
  const imageColors = new Set(
    images
      .map((image) => (typeof image.color === "string" ? image.color.trim() : ""))
      .filter(Boolean)
  );
  const errors: string[] = [];

  for (const color of variantColors) {
    if (!imageColors.has(color)) {
      errors.push(`Add an image tagged "${color}" for the ${color} SKU`);
    }
  }

  for (const color of imageColors) {
    if (!variantColors.has(color)) {
      errors.push(`Add a SKU with color "${color}" or remove that image tag`);
    }
  }

  return errors;
}

export function validateCreateProduct(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.title || typeof body.title !== "string" || body.title.trim().length < 2) {
    errors.push("Title is required and must be at least 2 characters");
  }
  if (typeof body.title === "string" && body.title.length > 200) {
    errors.push("Title must be at most 200 characters");
  }

  if (!body.slug || typeof body.slug !== "string" || !isValidSlug(body.slug)) {
    errors.push("Slug is required and must be URL-friendly (lowercase letters, numbers, hyphens)");
  }

  if (!body.description || typeof body.description !== "string" || body.description.trim().length < 1) {
    errors.push("Description is required");
  }
  if (typeof body.description === "string" && body.description.length > 5000) {
    errors.push("Description must be at most 5000 characters");
  }

  if (!body.category || typeof body.category !== "string" || !isValidObjectId(body.category)) {
    errors.push("Category is required and must be a valid ID");
  }

  if (!Array.isArray(body.variants) || body.variants.length < 1) {
    errors.push("At least one variant is required");
  } else if (body.variants.length > 50) {
    errors.push("A product can have at most 50 variants");
  } else {
    const skus = new Set<string>();
    (body.variants as Record<string, unknown>[]).forEach((v, i) => {
      if (!v.sku || typeof v.sku !== "string" || !isValidSKU(v.sku)) {
        errors.push(`Variant ${i}: SKU is required and must contain only letters, digits, and hyphens`);
      } else {
        const upperSku = (v.sku as string).toUpperCase();
        if (skus.has(upperSku)) {
          errors.push(`Variant ${i}: Duplicate SKU "${upperSku}"`);
        }
        skus.add(upperSku);
      }
      if (v.price === undefined || typeof v.price !== "number" || v.price < 0) {
        errors.push(`Variant ${i}: Price is required and must be a non-negative number`);
      }
      if (
        v.gst === undefined ||
        typeof v.gst !== "number" ||
        Number.isNaN(v.gst) ||
        v.gst < 0 ||
        v.gst > 100
      ) {
        errors.push(`Variant ${i}: GST is required and must be a number between 0 and 100`);
      }
      if (v.stock !== undefined && (typeof v.stock !== "number" || v.stock < 0)) {
        errors.push(`Variant ${i}: Stock must be a non-negative number`);
      }
      if (v.compareAtPrice !== undefined && (typeof v.compareAtPrice !== "number" || v.compareAtPrice < 0)) {
        errors.push(`Variant ${i}: Compare-at price must be a non-negative number`);
      }
    });
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      errors.push("Images must be an array");
    } else if (body.images.length > 10) {
      errors.push("A product can have at most 10 images");
    } else {
      (body.images as Record<string, unknown>[]).forEach((img, i) => {
        if (!img.url || typeof img.url !== "string") {
          errors.push(`Image ${i}: URL is required`);
        }
        if (!img.publicId || typeof img.publicId !== "string") {
          errors.push(`Image ${i}: Public ID is required`);
        }
      });
    }
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push("Tags must be an array of strings");
    } else if (body.tags.length > 20) {
      errors.push("A product can have at most 20 tags");
    }
  }

  if (body.relatedProducts !== undefined) {
    if (!Array.isArray(body.relatedProducts)) {
      errors.push("Related products must be an array of product IDs");
    } else if (body.relatedProducts.length > 12) {
      errors.push("A product can have at most 12 related products");
    } else {
      const seen = new Set<string>();
      for (const id of body.relatedProducts) {
        if (typeof id !== "string" || !isValidObjectId(id)) {
          errors.push("Each related product must be a valid product ID");
          break;
        }
        if (seen.has(id)) {
          errors.push("Related products must not contain duplicates");
          break;
        }
        seen.add(id);
      }
    }
  }

  if (body.relatedProductsHeading !== undefined) {
    if (typeof body.relatedProductsHeading !== "string") {
      errors.push("Related products heading must be a string");
    } else if (body.relatedProductsHeading.trim().length === 0) {
      errors.push("Related products heading cannot be empty");
    } else if (body.relatedProductsHeading.length > 80) {
      errors.push("Related products heading must be at most 80 characters");
    }
  }

  if (Array.isArray(body.variants) && Array.isArray(body.images)) {
    errors.push(
      ...validateProductColorImages(
        body.variants as ColorEntry[],
        body.images as ColorEntry[]
      )
    );
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateProduct(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 2) {
      errors.push("Title must be at least 2 characters");
    }
    if (typeof body.title === "string" && body.title.length > 200) {
      errors.push("Title must be at most 200 characters");
    }
  }

  if (body.slug !== undefined) {
    if (typeof body.slug !== "string" || !isValidSlug(body.slug)) {
      errors.push("Slug must be URL-friendly (lowercase letters, numbers, hyphens)");
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string") {
      errors.push("Description must be a string");
    } else if (body.description.length > 5000) {
      errors.push("Description must be at most 5000 characters");
    }
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !isValidObjectId(body.category)) {
      errors.push("Category must be a valid ID");
    }
  }

  if (body.variants !== undefined) {
    if (!Array.isArray(body.variants) || body.variants.length < 1) {
      errors.push("At least one variant is required");
    } else if (body.variants.length > 50) {
      errors.push("A product can have at most 50 variants");
    } else {
      const skus = new Set<string>();
      (body.variants as Record<string, unknown>[]).forEach((v, i) => {
        if (!v.sku || typeof v.sku !== "string" || !isValidSKU(v.sku)) {
          errors.push(`Variant ${i}: SKU is required and must contain only letters, digits, and hyphens`);
        } else {
          const upperSku = (v.sku as string).toUpperCase();
          if (skus.has(upperSku)) {
            errors.push(`Variant ${i}: Duplicate SKU "${upperSku}"`);
          }
          skus.add(upperSku);
        }
        if (v.price !== undefined && (typeof v.price !== "number" || v.price < 0)) {
          errors.push(`Variant ${i}: Price must be a non-negative number`);
        }
        if (
          v.gst === undefined ||
          typeof v.gst !== "number" ||
          Number.isNaN(v.gst) ||
          v.gst < 0 ||
          v.gst > 100
        ) {
          errors.push(`Variant ${i}: GST is required and must be a number between 0 and 100`);
        }
        if (v.stock !== undefined && (typeof v.stock !== "number" || v.stock < 0)) {
          errors.push(`Variant ${i}: Stock must be a non-negative number`);
        }
      });
    }
  }

  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      errors.push("Images must be an array");
    } else if (body.images.length > 10) {
      errors.push("A product can have at most 10 images");
    }
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) {
      errors.push("Tags must be an array of strings");
    } else if (body.tags.length > 20) {
      errors.push("A product can have at most 20 tags");
    }
  }

  if (body.relatedProducts !== undefined) {
    if (!Array.isArray(body.relatedProducts)) {
      errors.push("Related products must be an array of product IDs");
    } else if (body.relatedProducts.length > 12) {
      errors.push("A product can have at most 12 related products");
    } else {
      const seen = new Set<string>();
      for (const id of body.relatedProducts) {
        if (typeof id !== "string" || !isValidObjectId(id)) {
          errors.push("Each related product must be a valid product ID");
          break;
        }
        if (seen.has(id)) {
          errors.push("Related products must not contain duplicates");
          break;
        }
        seen.add(id);
      }
    }
  }

  if (body.relatedProductsHeading !== undefined) {
    if (typeof body.relatedProductsHeading !== "string") {
      errors.push("Related products heading must be a string");
    } else if (body.relatedProductsHeading.trim().length === 0) {
      errors.push("Related products heading cannot be empty");
    } else if (body.relatedProductsHeading.length > 80) {
      errors.push("Related products heading must be at most 80 characters");
    }
  }

  if (Array.isArray(body.variants) && Array.isArray(body.images)) {
    errors.push(
      ...validateProductColorImages(
        body.variants as ColorEntry[],
        body.images as ColorEntry[]
      )
    );
  }

  return { valid: errors.length === 0, errors };
}

export function validateCreateCategory(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.push("Name is required and must be at least 2 characters");
  }
  if (typeof body.name === "string" && body.name.length > 100) {
    errors.push("Name must be at most 100 characters");
  }

  if (!body.slug || typeof body.slug !== "string" || !isValidSlug(body.slug)) {
    errors.push("Slug is required and must be URL-friendly (lowercase letters, numbers, hyphens)");
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("Description must be a string");
  }
  if (typeof body.description === "string" && body.description.length > 500) {
    errors.push("Description must be at most 500 characters");
  }

  if (body.parent !== undefined && body.parent !== null) {
    if (typeof body.parent !== "string" || !isValidObjectId(body.parent)) {
      errors.push("Parent must be a valid category ID");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateCategory(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters");
    }
    if (typeof body.name === "string" && body.name.length > 100) {
      errors.push("Name must be at most 100 characters");
    }
  }

  if (body.slug !== undefined) {
    if (typeof body.slug !== "string" || !isValidSlug(body.slug)) {
      errors.push("Slug must be URL-friendly (lowercase letters, numbers, hyphens)");
    }
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("Description must be a string");
  }

  if (body.parent !== undefined && body.parent !== null) {
    if (typeof body.parent !== "string" || !isValidObjectId(body.parent)) {
      errors.push("Parent must be a valid category ID");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Cart Validators ─────────────────────────────────────────────────────────

export function validateCartItem(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.productId || typeof body.productId !== "string" || !isValidObjectId(body.productId)) {
    errors.push("Product ID is required and must be a valid ID");
  }

  if (!body.variantId || typeof body.variantId !== "string" || !isValidObjectId(body.variantId)) {
    errors.push("Variant ID is required and must be a valid ID");
  }

  if (body.quantity === undefined || typeof body.quantity !== "number") {
    errors.push("Quantity is required and must be a number");
  } else if (!Number.isInteger(body.quantity) || body.quantity < 1) {
    errors.push("Quantity must be a positive integer");
  } else if (body.quantity > 50) {
    errors.push("Quantity cannot exceed 50");
  }

  return { valid: errors.length === 0, errors };
}

export function validateCartItemUpdate(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (body.quantity === undefined || typeof body.quantity !== "number") {
    errors.push("Quantity is required and must be a number");
  } else if (!Number.isInteger(body.quantity) || body.quantity < 1) {
    errors.push("Quantity must be a positive integer");
  } else if (body.quantity > 50) {
    errors.push("Quantity cannot exceed 50");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Wishlist Validators ─────────────────────────────────────────────────────

export function validateWishlistItem(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.productId || typeof body.productId !== "string" || !isValidObjectId(body.productId)) {
    errors.push("Product ID is required and must be a valid ID");
  }

  if (body.variantId !== undefined) {
    if (typeof body.variantId !== "string" || !isValidObjectId(body.variantId)) {
      errors.push("Variant ID must be a valid ID");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Coupon Validators ───────────────────────────────────────────────────────

export function validateCreateCoupon(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.code || typeof body.code !== "string" || body.code.trim().length < 3) {
    errors.push("Code is required and must be at least 3 characters");
  } else if (body.code.length > 30) {
    errors.push("Code must be at most 30 characters");
  } else if (!/^[A-Za-z0-9_-]+$/.test(body.code)) {
    errors.push("Code must contain only letters, digits, hyphens, and underscores");
  }

  if (!body.type || !["percentage", "flat"].includes(body.type as string)) {
    errors.push('Type is required and must be "percentage" or "flat"');
  }

  if (body.value === undefined || typeof body.value !== "number" || body.value < 0) {
    errors.push("Value is required and must be a non-negative number");
  }

  if (body.type === "percentage" && typeof body.value === "number" && body.value > 100) {
    errors.push("Percentage value cannot exceed 100");
  }

  if (body.minOrderValue !== undefined) {
    if (typeof body.minOrderValue !== "number" || body.minOrderValue < 0) {
      errors.push("Minimum order value must be a non-negative number");
    }
  }

  if (body.maxDiscount !== undefined && body.maxDiscount !== null) {
    if (typeof body.maxDiscount !== "number" || body.maxDiscount < 0) {
      errors.push("Maximum discount must be a non-negative number");
    }
  }

  if (!body.expiresAt || typeof body.expiresAt !== "string") {
    errors.push("Expiry date is required (ISO date string)");
  } else {
    const expDate = new Date(body.expiresAt);
    if (isNaN(expDate.getTime())) {
      errors.push("Expiry date must be a valid date");
    } else if (expDate <= new Date()) {
      errors.push("Expiry date must be in the future");
    }
  }

  if (body.usageLimit === undefined || typeof body.usageLimit !== "number") {
    errors.push("Usage limit is required and must be a number");
  } else if (!Number.isInteger(body.usageLimit) || body.usageLimit < 1) {
    errors.push("Usage limit must be a positive integer");
  }

  if (body.perUserLimit !== undefined) {
    if (typeof body.perUserLimit !== "number" || body.perUserLimit < 0) {
      errors.push("Per-user limit must be a non-negative number");
    }
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push("Description must be a string");
  }

  errors.push(...validateApplicableProducts(body.applicableProducts));

  return { valid: errors.length === 0, errors };
}

const MAX_COUPON_PRODUCTS = 100;

function validateApplicableProducts(value: unknown): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    return ["Applicable products must be an array of product IDs"];
  }
  if (value.length > MAX_COUPON_PRODUCTS) {
    return [`A coupon can target at most ${MAX_COUPON_PRODUCTS} products`];
  }
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const id of value) {
    if (typeof id !== "string" || !isValidObjectId(id)) {
      errors.push("Each applicable product must be a valid product ID");
      continue;
    }
    if (seen.has(id)) {
      errors.push("Duplicate products are not allowed on a coupon");
      continue;
    }
    seen.add(id);
  }
  return errors;
}

export function validateUpdateCoupon(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (body.code !== undefined) {
    if (typeof body.code !== "string" || body.code.trim().length < 3) {
      errors.push("Code must be at least 3 characters");
    } else if (body.code.length > 30) {
      errors.push("Code must be at most 30 characters");
    } else if (!/^[A-Za-z0-9_-]+$/.test(body.code)) {
      errors.push("Code must contain only letters, digits, hyphens, and underscores");
    }
  }

  if (body.type !== undefined && !["percentage", "flat"].includes(body.type as string)) {
    errors.push('Type must be "percentage" or "flat"');
  }

  if (body.value !== undefined) {
    if (typeof body.value !== "number" || body.value < 0) {
      errors.push("Value must be a non-negative number");
    }
  }

  if (body.type === "percentage" && typeof body.value === "number" && body.value > 100) {
    errors.push("Percentage value cannot exceed 100");
  }

  if (body.expiresAt !== undefined) {
    if (typeof body.expiresAt !== "string") {
      errors.push("Expiry date must be a string");
    } else {
      const expDate = new Date(body.expiresAt);
      if (isNaN(expDate.getTime())) {
        errors.push("Expiry date must be a valid date");
      }
    }
  }

  if (body.usageLimit !== undefined) {
    if (typeof body.usageLimit !== "number" || !Number.isInteger(body.usageLimit) || body.usageLimit < 1) {
      errors.push("Usage limit must be a positive integer");
    }
  }

  if (body.minOrderValue !== undefined) {
    if (typeof body.minOrderValue !== "number" || body.minOrderValue < 0) {
      errors.push("Minimum order value must be a non-negative number");
    }
  }

  if (body.maxDiscount !== undefined && body.maxDiscount !== null) {
    if (typeof body.maxDiscount !== "number" || body.maxDiscount < 0) {
      errors.push("Maximum discount must be a non-negative number");
    }
  }

  if (body.perUserLimit !== undefined) {
    if (typeof body.perUserLimit !== "number" || body.perUserLimit < 0) {
      errors.push("Per-user limit must be a non-negative number");
    }
  }

  errors.push(...validateApplicableProducts(body.applicableProducts));

  return { valid: errors.length === 0, errors };
}

// ─── Checkout Validators ─────────────────────────────────────────────────────

export function validateCheckout(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  // Idempotency key
  if (!body.idempotencyKey || typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 10) {
    errors.push("Idempotency key is required (min 10 characters)");
  } else if (body.idempotencyKey.length > 128) {
    errors.push("Idempotency key must be at most 128 characters");
  }

  // Shipping address
  if (!body.shippingAddress || typeof body.shippingAddress !== "object") {
    errors.push("Shipping address is required");
  } else {
    const addr = body.shippingAddress as Record<string, unknown>;

    if (!addr.name || typeof addr.name !== "string" || addr.name.trim().length < 2) {
      errors.push("Shipping name is required (min 2 characters)");
    }
    if (!addr.phone || typeof addr.phone !== "string" || !/^[6-9]\d{9}$/.test(addr.phone.trim())) {
      errors.push("Valid 10-digit Indian phone number is required");
    }
    if (!addr.line1 || typeof addr.line1 !== "string" || addr.line1.trim().length < 5) {
      errors.push("Address line 1 is required (min 5 characters)");
    }
    if (!addr.city || typeof addr.city !== "string" || addr.city.trim().length < 2) {
      errors.push("City is required");
    }
    if (!addr.state || typeof addr.state !== "string" || addr.state.trim().length < 2) {
      errors.push("State is required");
    }
    if (!addr.pincode || typeof addr.pincode !== "string" || !/^\d{6}$/.test(addr.pincode.trim())) {
      errors.push("Valid 6-digit pincode is required");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Payment Verification Validator ──────────────────────────────────────────

export function validatePaymentVerification(body: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];

  if (!body.razorpay_order_id || typeof body.razorpay_order_id !== "string") {
    errors.push("razorpay_order_id is required");
  }
  if (!body.razorpay_payment_id || typeof body.razorpay_payment_id !== "string") {
    errors.push("razorpay_payment_id is required");
  }
  if (!body.razorpay_signature || typeof body.razorpay_signature !== "string") {
    errors.push("razorpay_signature is required");
  }

  return { valid: errors.length === 0, errors };
}

// ─── Sale campaign validators ────────────────────────────────────────────────

function isSaleDiscountType(value: unknown): value is "percentage" | "amount" {
  return value === "percentage" || value === "amount";
}

function validateSaleDiscount(
  type: unknown,
  value: unknown,
  field: string,
  errors: string[]
) {
  if (!isSaleDiscountType(type)) {
    errors.push(`${field} type must be "percentage" or "amount"`);
    return;
  }
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    errors.push(`${field} value must be a positive number`);
    return;
  }
  if (type === "percentage" && value > 90) {
    errors.push(`${field} percentage cannot exceed 90%`);
  }
}

function validateSalePayload(
  body: Record<string, unknown>,
  { partial }: { partial: boolean }
): ValidationResult {
  const errors: string[] = [];
  const required = (key: string) => !partial || body[key] !== undefined;

  if (required("title")) {
    if (typeof body.title !== "string" || body.title.trim().length < 2) {
      errors.push("Title must be at least 2 characters");
    }
  }
  if (required("slug")) {
    if (typeof body.slug !== "string" || !isValidSlug(body.slug.trim().toLowerCase())) {
      errors.push("A valid URL slug is required");
    }
  }
  if (body.subtitle !== undefined && body.subtitle !== "" && typeof body.subtitle !== "string") {
    errors.push("Subtitle must be a string");
  }
  if (body.description !== undefined && body.description !== "" && typeof body.description !== "string") {
    errors.push("Description must be a string");
  }
  if (
    body.bannerCtaLabel !== undefined &&
    (typeof body.bannerCtaLabel !== "string" || body.bannerCtaLabel.trim().length > 40)
  ) {
    errors.push("Banner CTA label must be at most 40 characters");
  }
  if (body.bannerCtaHref !== undefined) {
    if (
      typeof body.bannerCtaHref !== "string" ||
      body.bannerCtaHref.trim().length > 300 ||
      (body.bannerCtaHref.trim() !== "" &&
        !body.bannerCtaHref.trim().startsWith("/") &&
        !/^https?:\/\//i.test(body.bannerCtaHref.trim()))
    ) {
      errors.push("Banner CTA link must be an internal path or an http(s) URL");
    }
  }
  if (body.bannerCtaPosition !== undefined && !isBannerCtaPosition(body.bannerCtaPosition)) {
    errors.push("Banner CTA position is invalid");
  }
  if (required("startsAt")) {
    if (!body.startsAt || Number.isNaN(Date.parse(String(body.startsAt)))) {
      errors.push("A valid start date is required");
    }
  }
  if (required("endsAt")) {
    if (!body.endsAt || Number.isNaN(Date.parse(String(body.endsAt)))) {
      errors.push("A valid end date is required");
    }
  }
  if (body.startsAt && body.endsAt) {
    const start = Date.parse(String(body.startsAt));
    const end = Date.parse(String(body.endsAt));
    if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
      errors.push("End date must be after the start date");
    }
  }
  if (required("defaultDiscountType") || required("defaultDiscountValue")) {
    validateSaleDiscount(
      body.defaultDiscountType,
      body.defaultDiscountValue,
      "Default discount",
      errors
    );
  }
  if (required("items")) {
    if (!Array.isArray(body.items) || body.items.length < 1) {
      errors.push("Select at least one product for the sale");
    } else if (body.items.length > 80) {
      errors.push("A sale can include at most 80 products");
    } else {
      const seen = new Set<string>();
      for (const raw of body.items) {
        if (!raw || typeof raw !== "object") {
          errors.push("Each sale item must be an object");
          continue;
        }
        const item = raw as Record<string, unknown>;
        if (typeof item.product !== "string" || !isValidObjectId(item.product)) {
          errors.push("Each sale item needs a valid product id");
          continue;
        }
        if (seen.has(item.product)) {
          errors.push("Duplicate products are not allowed in a sale");
          continue;
        }
        seen.add(item.product);
        validateSaleDiscount(item.discountType, item.value, "Item discount", errors);
      }
    }
  }
  if (body.homeLimit !== undefined) {
    if (typeof body.homeLimit !== "number" || body.homeLimit < 1 || body.homeLimit > 12) {
      errors.push("Home product limit must be between 1 and 12");
    }
  }
  if (body.priority !== undefined) {
    if (typeof body.priority !== "number" || body.priority < 0 || body.priority > 1000) {
      errors.push("Priority must be between 0 and 1000");
    }
  }
  if (body.banner !== undefined && body.banner !== null) {
    if (typeof body.banner !== "object") {
      errors.push("Banner must be an image object");
    } else {
      const banner = body.banner as Record<string, unknown>;
      if (typeof banner.url !== "string" || typeof banner.publicId !== "string") {
        errors.push("Banner must include url and publicId");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateCreateSale(body: Record<string, unknown>): ValidationResult {
  return validateSalePayload(body, { partial: false });
}

export function validateUpdateSale(body: Record<string, unknown>): ValidationResult {
  return validateSalePayload(body, { partial: true });
}
