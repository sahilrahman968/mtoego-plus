import { Types } from "mongoose";
import ProductPriceHistory from "@/models/product-price-history.model";
import type { IProductVariant } from "@/models/product.model";

type VariantSnapshot = Pick<
  IProductVariant,
  "_id" | "size" | "color" | "sku" | "price" | "gst" | "compareAtPrice"
>;

function variantLabel(variant: VariantSnapshot): string {
  const parts = [variant.color, variant.size].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : variant.sku;
}

function priceKey(variant: VariantSnapshot): string {
  return [
    variant.price,
    variant.gst ?? 18,
    variant.compareAtPrice ?? "",
  ].join("|");
}

export function inclusivePrice(price: number, gst = 18): number {
  return Math.round(price * (1 + gst / 100) * 100) / 100;
}

export async function ensureProductPriceBaseline(
  productId: Types.ObjectId | string,
  variants: VariantSnapshot[],
  createdAt: Date
): Promise<void> {
  const exists = await ProductPriceHistory.exists({ product: productId });
  if (exists) return;

  if (variants.length === 0) return;

  await ProductPriceHistory.insertMany(
    variants.map((variant) => ({
      product: productId,
      variant: variant._id,
      variantLabel: variantLabel(variant),
      sku: variant.sku,
      price: variant.price,
      gst: typeof variant.gst === "number" ? variant.gst : 18,
      compareAtPrice: variant.compareAtPrice,
      effectiveAt: createdAt,
      source: "initial" as const,
    }))
  );
}

export async function recordProductPriceChanges(
  productId: Types.ObjectId | string,
  previousVariants: VariantSnapshot[],
  nextVariants: VariantSnapshot[],
  changedBy?: string
): Promise<void> {
  const previousById = new Map(
    previousVariants.map((variant) => [String(variant._id), variant])
  );
  const now = new Date();
  const entries: {
    product: Types.ObjectId | string;
    variant: Types.ObjectId;
    variantLabel: string;
    sku: string;
    price: number;
    gst: number;
    compareAtPrice?: number;
    effectiveAt: Date;
    source: "update";
    changedBy?: string;
  }[] = [];

  for (const variant of nextVariants) {
    const previous = previousById.get(String(variant._id));
    if (!previous) {
      entries.push({
        product: productId,
        variant: variant._id,
        variantLabel: variantLabel(variant),
        sku: variant.sku,
        price: variant.price,
        gst: typeof variant.gst === "number" ? variant.gst : 18,
        compareAtPrice: variant.compareAtPrice,
        effectiveAt: now,
        source: "update",
        changedBy,
      });
      continue;
    }

    if (priceKey(previous) !== priceKey(variant)) {
      entries.push({
        product: productId,
        variant: variant._id,
        variantLabel: variantLabel(variant),
        sku: variant.sku,
        price: variant.price,
        gst: typeof variant.gst === "number" ? variant.gst : 18,
        compareAtPrice: variant.compareAtPrice,
        effectiveAt: now,
        source: "update",
        changedBy,
      });
    }
  }

  if (entries.length > 0) {
    await ProductPriceHistory.insertMany(entries);
  }
}
