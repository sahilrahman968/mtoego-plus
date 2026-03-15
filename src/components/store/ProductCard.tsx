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

  return (
    <div className="group relative bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Wishlist button */}
      {onWishlistToggle && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onWishlistToggle(product._id);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={16}
            className={
              isWishlisted
                ? "fill-primary text-primary"
                : "text-muted group-hover:text-foreground"
            }
          />
        </button>
      )}

      {/* Discount badge */}
      {discount > 0 && (
        <div className="absolute top-3 left-3 z-10 bg-danger text-white text-xs font-bold px-2 py-1 rounded-md">
          -{discount}%
        </div>
      )}

      {/* Image */}
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-card-hover overflow-hidden">
          <Image
            src={getProductImage(product.images)}
            alt={product.images?.[0]?.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="p-3 sm:p-4">
        {product.category && (
          <Link
            href={`/categories/${product.category.slug}`}
            className="text-[11px] font-medium text-primary uppercase tracking-wide hover:underline"
          >
            {product.category.name}
          </Link>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-semibold text-foreground mt-1 line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-bold text-foreground">
            {hasMultiplePrices ? "From " : ""}
            {formatPrice(lowestPrice)}
          </span>
          {highestCompare > lowestPrice && (
            <span className="text-xs text-muted line-through">
              {formatPrice(highestCompare)}
            </span>
          )}
        </div>

        {/* Stock indicator */}
        {activeVariants.length > 0 && (
          <div className="mt-2">
            {activeVariants.every((v) => v.stock === 0) ? (
              <span className="text-xs text-danger font-medium">Out of stock</span>
            ) : activeVariants.some((v) => v.stock > 0 && v.stock <= 5) ? (
              <span className="text-xs text-warning font-medium">Few left</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
