"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { formatPrice, getProductImage, getDiscountPercent } from "@/lib/utils";
import type { ProductData } from "@/lib/store-api";

interface ProductCardProps {
  product: ProductData;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
}

export default function ProductCard({
  product,
  onWishlistToggle,
  isWishlisted = false,
}: ProductCardProps) {
  const activeVariants = product.variants.filter((v) => v.isActive !== false);
  const lowestPrice = activeVariants.length
    ? Math.min(...activeVariants.map((v) => v.price))
    : 0;
  const highestCompare = activeVariants.length
    ? Math.max(...activeVariants.map((v) => v.compareAtPrice || 0))
    : 0;
  const discount = getDiscountPercent(lowestPrice, highestCompare);
  const hasMultiplePrices =
    activeVariants.length > 1 &&
    new Set(activeVariants.map((v) => v.price)).size > 1;
  const createdAtTs = Date.parse(product.createdAt);
  const isNewDrop =
    Number.isFinite(createdAtTs) &&
    Date.now() - createdAtTs < 1000 * 60 * 60 * 24 * 21;
  const tagText =
    product.tags.find((t) => /best|seller|new/i.test(t)) ||
    (product.isFeatured ? "Best Seller" : isNewDrop ? "New" : "");
  const formattedTagText = tagText ? tagText.toUpperCase() : "";

  return (
    <div className="group relative overflow-hidden bg-transparent">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-[1/1.02] overflow-hidden border border-border bg-black/65">
          <Image
            src={getProductImage(product.images)}
            alt={product.images?.[0]?.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5">
            {formattedTagText ? (
              <span className="bg-primary px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                {formattedTagText}
              </span>
            ) : null}
          </div>
          {discount > 0 && (
            <span className="absolute right-2 top-2 z-10 border border-border bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground">
              -{discount}%
            </span>
          )}
          {onWishlistToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onWishlistToggle(product._id);
              }}
              className="absolute bottom-2 right-2 z-10 flex h-7 w-7 items-center justify-center border border-border bg-black/60 transition-colors hover:border-primary"
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
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
      </Link>

      <div className="pt-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {product.category && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted hover:text-foreground"
              >
                {product.category.name}
              </Link>
            )}
            <Link href={`/products/${product.slug}`}>
              <h3 className="mt-1 line-clamp-1 text-base font-bold uppercase tracking-[0.03em] text-foreground transition-colors group-hover:text-primary">
                {product.title}
              </h3>
            </Link>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-foreground">
              {hasMultiplePrices ? "From " : ""}
              {formatPrice(lowestPrice)}
            </p>
            {highestCompare > lowestPrice && (
              <p className="text-[11px] text-muted line-through">
                {formatPrice(highestCompare)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
