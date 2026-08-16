"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { formatPrice, getProductImage, getDiscountPercent } from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import type { ProductData } from "@/lib/store-api";

/** Products coming from the wishlist carry only a subset of the catalog fields. */
export type ProductCardProduct = Pick<
  ProductData,
  "_id" | "title" | "slug" | "images" | "variants"
> &
  Partial<Pick<ProductData, "category" | "tags" | "isFeatured" | "createdAt">>;

interface ProductCardProps {
  product: ProductCardProduct;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
  onAddToCart?: (productId: string) => void;
  addToCartDisabled?: boolean;
  unavailable?: boolean;
  busy?: boolean;
  status?: { label: string; tone: "success" | "danger" };
}

export default function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
  onAddToCart,
  addToCartDisabled = false,
  unavailable = false,
  busy = false,
  status,
}: ProductCardProps) {
  const activeVariants = product.variants.filter((v) => v.isActive !== false);
  const lowestIncl = activeVariants.length
    ? Math.min(...activeVariants.map((v) => priceInclGst(v.price, v.gst)))
    : 0;
  const highestCompareIncl = activeVariants.length
    ? Math.max(
        ...activeVariants.map((v) =>
          v.compareAtPrice ? priceInclGst(v.compareAtPrice, v.gst) : 0
        )
      )
    : 0;
  const discount = getDiscountPercent(lowestIncl, highestCompareIncl);
  const createdAtTs = product.createdAt ? Date.parse(product.createdAt) : NaN;
  const isNewDrop =
    Number.isFinite(createdAtTs) &&
    Date.now() - createdAtTs < 1000 * 60 * 60 * 24 * 21;
  const tagText =
    product.tags?.find((t) => /best|seller|new/i.test(t)) ||
    (product.isFeatured ? "Best Seller" : isNewDrop ? "New" : "");
  const formattedTagText = tagText ? tagText.toUpperCase() : "";
  const href = `/products/${product.slug}`;
  const imageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
  const imageAlt = product.images?.[0]?.alt || product.title;
  const hasActions = Boolean(onWishlistToggle || onAddToCart);

  return (
    <div
      className={`group relative overflow-hidden bg-transparent ${
        busy ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div className="relative aspect-[1/1.02] overflow-hidden border border-border bg-black/65">
        {unavailable ? (
          <div className="absolute inset-0">
            <Image
              src={getProductImage(product.images)}
              alt={imageAlt}
              fill
              sizes={imageSizes}
              className="object-cover grayscale"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <span className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                Unavailable
              </span>
            </div>
          </div>
        ) : (
          <Link href={href} className="absolute inset-0">
            <Image
              src={getProductImage(product.images)}
              alt={imageAlt}
              fill
              sizes={imageSizes}
              className="object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </Link>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-2 sm:top-2">
          {formattedTagText ? (
            <span className="max-w-[68%] truncate bg-primary px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
              {formattedTagText}
            </span>
          ) : null}
          {discount > 0 && !unavailable && (
            <span className="border border-border bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground">
              -{discount}%
            </span>
          )}
        </div>

        {hasActions && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 sm:bottom-2 sm:right-2">
            {onAddToCart && (
              <button
                type="button"
                onClick={() => onAddToCart(product._id)}
                disabled={addToCartDisabled || unavailable}
                className="flex h-7 w-7 items-center justify-center border border-border bg-black/60 text-foreground/80 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:text-muted disabled:hover:border-border"
                aria-label={`Move ${product.title} to cart`}
              >
                <ShoppingCart size={14} />
              </button>
            )}
            {onWishlistToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onWishlistToggle(product._id);
                }}
                className="flex h-7 w-7 items-center justify-center border border-border bg-black/60 transition-colors hover:border-primary"
                aria-label={
                  isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart
                  size={14}
                  className={
                    isWishlisted
                      ? "fill-primary text-primary"
                      : "text-foreground/80 group-hover:text-primary"
                  }
                />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="pt-3 sm:pt-3">
        <div className="min-w-0">
          {unavailable ? (
            <h3 className="line-clamp-2 text-[10px] font-black uppercase leading-tight tracking-[0.01em] text-muted sm:text-[11px] lg:text-xs">
              {product.title}
            </h3>
          ) : (
            <Link href={href} className="block min-w-0">
              <h3 className="line-clamp-2 text-[10px] font-black uppercase leading-tight tracking-[0.01em] text-white transition-colors sm:text-[11px] lg:text-xs">
                {product.title}
              </h3>
            </Link>
          )}
          <div className="mt-1.5 flex items-end justify-between gap-6 sm:gap-8">
            <div className="min-w-0 flex-1">
              {product.category && (
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted hover:text-foreground"
                >
                  {product.category.name}
                </Link>
              )}
              {status && (
                <p
                  className={`line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.2em] ${
                    status.tone === "danger" ? "text-danger" : "text-success"
                  }`}
                >
                  {status.label}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right leading-none">
              <p className="text-xs font-bold text-foreground">
                {unavailable ? "—" : formatPrice(lowestIncl)}
              </p>
              {!unavailable && highestCompareIncl > lowestIncl && (
                <p className="mt-1 text-[9px] text-muted line-through">
                  {formatPrice(highestCompareIncl)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
