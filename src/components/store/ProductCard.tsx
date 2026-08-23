"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Loader2, ShoppingCart } from "lucide-react";
import {
  formatPrice,
  getProductImage,
  getDiscountPercent,
  isProductOutOfStock,
} from "@/lib/utils";
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
  Partial<Pick<ProductData, "category" | "tags" | "isFeatured" | "createdAt" | "sale">>;

/** One icon size for every control on the card — mixed sizes read as sloppy. */
const ICON_SIZE = 16;
const ICON_STROKE = 1.75;

/** Below this, the card nudges rather than staying silent about thin stock. */
const LOW_STOCK_THRESHOLD = 3;

/* 36px visual button + 4px of invisible padding on each side = a 44px target,
   without the icon growing or the layout moving. */
const ICON_BUTTON =
  "absolute z-10 flex h-9 w-9 items-center justify-center border bg-black/60 backdrop-blur-sm transition-colors duration-200 after:absolute after:-inset-1 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

interface ProductCardProps {
  product: ProductCardProduct;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
  onAddToCart?: (productId: string) => void;
  addToCartDisabled?: boolean;
  unavailable?: boolean;
  busy?: boolean;
  status?: { label: string; tone: "success" | "warning" | "danger" };
  /** When true, drops the card border. */
  borderless?: boolean;
  /** Overrides the auto-derived corner badge. Pass `null` to hide it. */
  badgeLabel?: string | null;
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
  badgeLabel,
}: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  /* Snapshot once so the 21-day "New" check stays render-pure. */
  const [now] = useState(() => Date.now());
  /* Which of the two overlay actions is in flight, so only that button spins. */
  const [pending, setPending] = useState<"cart" | "wishlist" | null>(null);
  const actionBusy = pending !== null;

  const activeVariants = product.variants.filter((v) => v.isActive !== false);
  const inclPrices = activeVariants.map((v) => priceInclGst(v.price, v.gst));
  const lowestIncl = inclPrices.length ? Math.min(...inclPrices) : 0;
  const priceVaries = inclPrices.length > 1 && Math.max(...inclPrices) > lowestIncl;
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
    now - createdAtTs < 1000 * 60 * 60 * 24 * 21;
  const derivedTagText =
    product.sale?.badgeLabel ||
    product.tags?.find((t) => /best|seller|new/i.test(t)) ||
    (product.isFeatured ? "Best Seller" : isNewDrop ? "New" : "");
  const tagText = badgeLabel === undefined ? derivedTagText : badgeLabel || "";
  const formattedTagText = tagText ? tagText.toUpperCase() : "";
  const href = `/products/${product.slug}`;
  const imageSizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";
  const imageAlt = product.images?.[0]?.alt || product.title;
  const firstInStockVariant = activeVariants.find((v) => v.stock > 0);
  const outOfStock = isProductOutOfStock(product);
  const stockLeft = activeVariants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
  const lowStock =
    !unavailable && !outOfStock && stockLeft > 0 && stockLeft <= LOW_STOCK_THRESHOLD;
  const cartDisabled =
    addToCartDisabled || unavailable || !firstInStockVariant || actionBusy;
  const showFilledHeart = onWishlistToggle ? isWishlisted : wishlisted;
  /* The status prop wins over the derived nudge, except when it only repeats the
     sold-out state the image badge already carries. */
  const visibleStatus =
    status && !(outOfStock && status.label.toLowerCase() === "out of stock")
      ? status
      : lowStock
        ? { label: `Only ${stockLeft} left`, tone: "warning" as const }
        : null;

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
    setPending("wishlist");
    const res = await addToWishlist(product._id, firstInStockVariant?._id);
    if (res.success) {
      setWishlisted(true);
      toast("Added to wishlist!", "success");
    } else {
      toast(res.message || "Already in wishlist", "info");
      setWishlisted(true);
    }
    setPending(null);
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
    setPending("cart");
    const res = await addToCart(product._id, firstInStockVariant._id, 1);
    if (res.success) {
      toast("Added to cart!", "success");
    } else {
      toast(res.message, "error");
    }
    setPending(null);
  };

  return (
    <div
      aria-busy={busy || undefined}
      className={`group relative overflow-hidden bg-transparent transition-colors duration-200 ${
        borderless ? "" : "border border-border hover:border-primary/45"
      } ${busy ? "pointer-events-none opacity-50" : ""}`}
    >
      <div className="relative aspect-[1/1.02] overflow-hidden border-b border-border bg-black/65">
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
          /* Decorative twin of the title link: keeping it out of the tab order
             leaves one stop and one announcement per card. */
          <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
            <Image
              src={getProductImage(product.images)}
              alt={imageAlt}
              fill
              sizes={imageSizes}
              className={`object-cover transition-transform duration-500 ease-out motion-reduce:transition-none ${
                outOfStock
                  ? "opacity-70 grayscale-[35%]"
                  : "motion-safe:group-hover:scale-[1.06]"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </Link>
        )}

        {formattedTagText ? (
          <span className="eyebrow-xs pointer-events-none absolute left-2 top-2 z-10 max-w-[60%] truncate whitespace-nowrap bg-primary px-2 py-1 text-white sm:left-3 sm:top-3">
            {formattedTagText}
          </span>
        ) : null}

        {outOfStock && !unavailable ? (
          <span className="eyebrow-xs pointer-events-none absolute bottom-2 left-2 z-10 whitespace-nowrap border border-danger/60 bg-black/75 px-2 py-1 text-danger sm:bottom-3 sm:left-3">
            Sold out
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleWishlist}
          disabled={actionBusy}
          aria-pressed={showFilledHeart}
          className={`${ICON_BUTTON} right-2 top-2 border-border/80 text-foreground hover:border-primary hover:text-primary disabled:opacity-60 sm:right-3 sm:top-3 ${
            showFilledHeart ? "border-primary/70" : ""
          }`}
          aria-label={
            showFilledHeart ? "Remove from wishlist" : "Add to wishlist"
          }
        >
          {pending === "wishlist" ? (
            <Loader2
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <Heart
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className={
                showFilledHeart
                  ? "fill-primary text-primary"
                  : "text-foreground/90"
              }
            />
          )}
        </button>

        <button
          type="button"
          onClick={handleCart}
          disabled={cartDisabled}
          className={`${ICON_BUTTON} bottom-2 right-2 border-border/80 text-foreground/90 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border/80 disabled:hover:text-foreground/90 sm:bottom-3 sm:right-3`}
          aria-label={
            outOfStock || unavailable
              ? `${product.title} is unavailable`
              : `Add ${product.title} to cart`
          }
        >
          {pending === "cart" ? (
            <Loader2
              size={ICON_SIZE}
              strokeWidth={ICON_STROKE}
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ShoppingCart size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="px-3 pb-3 pt-3">
        {unavailable ? (
          <h3 className="line-clamp-2 text-xs font-bold uppercase leading-snug text-muted sm:text-[13px]">
            {product.title}
          </h3>
        ) : (
          <Link
            href={href}
            className="block min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <h3 className="line-clamp-2 text-xs font-bold uppercase leading-snug text-white transition-colors duration-200 group-hover:text-primary sm:text-[13px]">
              {product.title}
            </h3>
          </Link>
        )}

        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {unavailable ? (
                <p className="price text-sm font-normal text-muted">—</p>
              ) : (
                <>
                  {priceVaries && (
                    <span className="eyebrow-xs text-muted">From</span>
                  )}
                  <p className="price text-sm font-bold text-foreground">
                    {formatPrice(lowestIncl)}
                  </p>
                  {highestCompareIncl > lowestIncl && (
                    <p className="price text-sm text-muted line-through">
                      <span className="sr-only">Was </span>
                      {formatPrice(highestCompareIncl)}
                    </p>
                  )}
                </>
              )}
            </div>
            {visibleStatus ? (
              <p
                className={`eyebrow-xs mt-1 line-clamp-1 ${
                  visibleStatus.tone === "danger"
                    ? "text-danger"
                    : visibleStatus.tone === "warning"
                      ? "text-warning"
                      : "text-success"
                }`}
              >
                {visibleStatus.label}
              </p>
            ) : null}
          </div>
          {!unavailable && !outOfStock && discount > 0 && (
            <p className="price tabular shrink-0 text-sm text-primary">
              <span className="sr-only">Discount </span>-{discount}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
