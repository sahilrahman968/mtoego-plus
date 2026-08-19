"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart } from "lucide-react";
import { formatPrice, getProductImage, getDiscountPercent } from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import { addToWishlist, type ProductData } from "@/lib/store-api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";

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
  /** When true, drops the image frame border (home merchandising sections). */
  borderless?: boolean;
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
  borderless = false,
}: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [actionBusy, setActionBusy] = useState(false);

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
  const firstInStockVariant = activeVariants.find((v) => v.stock > 0);
  const cartDisabled =
    addToCartDisabled || unavailable || !firstInStockVariant || actionBusy;
  const showFilledHeart = onWishlistToggle ? isWishlisted : wishlisted;

  const redirectToLogin = () => {
    const redirect = product.slug ? `/products/${product.slug}` : "/wishlist";
    router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onWishlistToggle) {
      onWishlistToggle(product._id);
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }
    if (actionBusy) return;
    setActionBusy(true);
    const res = await addToWishlist(product._id, firstInStockVariant?._id);
    if (res.success) {
      setWishlisted(true);
      toast("Added to wishlist!", "success");
    } else {
      toast(res.message || "Already in wishlist", "info");
      setWishlisted(true);
    }
    setActionBusy(false);
  };

  const handleCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product._id);
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }
    if (!firstInStockVariant || cartDisabled) return;
    setActionBusy(true);
    const res = await addToCart(product._id, firstInStockVariant._id, 1);
    if (res.success) {
      toast("Added to cart!", "success");
    } else {
      toast(res.message, "error");
    }
    setActionBusy(false);
  };

  return (
    <div
      className={`group relative overflow-hidden bg-transparent ${
        busy ? "pointer-events-none opacity-50" : ""
      }`}
    >
      <div
        className={`relative aspect-[1/1.02] overflow-hidden bg-black/65 ${
          borderless ? "" : "border border-border"
        }`}
      >
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
              <span className="eyebrow-xs px-3 py-1.5 text-white">
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

        {formattedTagText ? (
          <span className="pointer-events-none absolute left-2 top-2 z-10 eyebrow-xs max-w-[60%] truncate bg-primary px-2 py-1 text-white sm:left-3 sm:top-3">
            {formattedTagText}
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleWishlist}
          disabled={actionBusy}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center border border-border/80 bg-black/55 text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-60 sm:right-3 sm:top-3"
          aria-label={
            showFilledHeart ? "Remove from wishlist" : "Add to wishlist"
          }
        >
          <Heart
            size={15}
            className={
              showFilledHeart
                ? "fill-primary text-primary"
                : "text-foreground/90"
            }
          />
        </button>

        <button
          type="button"
          onClick={handleCart}
          disabled={cartDisabled}
          className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center border border-border/80 bg-black/55 text-foreground/90 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/80 disabled:hover:text-foreground/90 sm:bottom-3 sm:right-3"
          aria-label={`Add ${product.title} to cart`}
        >
          <ShoppingCart size={15} />
        </button>
      </div>

      <div className="pt-3">
        {unavailable ? (
          <h3 className="line-clamp-2 text-xs font-bold uppercase leading-snug text-muted sm:text-[13px]">
            {product.title}
          </h3>
        ) : (
          <Link href={href} className="block min-w-0">
            <h3 className="line-clamp-2 text-xs font-bold uppercase leading-snug text-white transition-colors sm:text-[13px]">
              {product.title}
            </h3>
          </Link>
        )}

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="price text-sm font-bold text-foreground">
                {unavailable ? "—" : formatPrice(lowestIncl)}
              </p>
              {!unavailable && highestCompareIncl > lowestIncl && (
                <p className="price text-sm text-muted line-through">
                  {formatPrice(highestCompareIncl)}
                </p>
              )}
            </div>
            {status && (
              <p
                className={`eyebrow-xs mt-1 line-clamp-1 ${
                  status.tone === "danger" ? "text-danger" : "text-success"
                }`}
              >
                {status.label}
              </p>
            )}
          </div>
          {!unavailable && discount > 0 && (
            <p className="price shrink-0 text-sm tabular text-primary">
              -{discount}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
