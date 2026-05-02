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
          <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2 sm:inset-x-2 sm:top-2">
            {formattedTagText ? (
              <span className="max-w-[68%] truncate bg-primary px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
                {formattedTagText}
              </span>
            ) : null}
            {discount > 0 && (
              <span className="border border-border bg-black/60 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground">
                -{discount}%
              </span>
            )}
          </div>
          {onWishlistToggle && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onWishlistToggle(product._id);
              }}
              className="absolute bottom-3 right-3 z-10 flex h-7 w-7 items-center justify-center border border-border bg-black/60 transition-colors hover:border-primary sm:bottom-2 sm:right-2"
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

      <div className="pt-3 sm:pt-3">
        <div className="min-w-0">
          <Link href={`/products/${product.slug}`} className="block min-w-0">
            <h3 className="line-clamp-2 text-[10px] font-black uppercase leading-tight tracking-[0.01em] text-white transition-colors sm:text-[11px] lg:text-xs">
              {product.title}
            </h3>
          </Link>
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
            </div>
            <div className="shrink-0 text-right leading-none">
              <p className="text-xs font-bold text-foreground">
                {formatPrice(lowestPrice)}
              </p>
              {highestCompare > lowestPrice && (
                <p className="mt-1 text-[9px] text-muted line-through">
                  {formatPrice(highestCompare)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
