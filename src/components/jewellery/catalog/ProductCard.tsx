"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { addToWishlist, type ProductData } from "@/lib/store-api";
import { priceInclGst } from "@/lib/pricing";
import { formatPrice, getDiscountPercent, getProductImage, isProductOutOfStock } from "@/lib/utils";
import { useToast } from "@/components/jewellery/shared/Toast";

export type ProductCardProduct = Pick<ProductData, "_id" | "title" | "slug" | "images" | "variants"> &
  Partial<Pick<ProductData, "category" | "tags" | "isFeatured" | "createdAt" | "sale">>;

interface ProductCardProps {
  product: ProductCardProduct;
  onWishlistToggle?: (productId: string) => void;
  isWishlisted?: boolean;
  onAddToCart?: (productId: string) => void;
  addToCartDisabled?: boolean;
  unavailable?: boolean;
  busy?: boolean;
  status?: { label: string; tone: "success" | "danger" };
  borderless?: boolean;
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
  badgeLabel,
}: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [wishlisted, setWishlisted] = useState(isWishlisted);
  const [actionBusy, setActionBusy] = useState(false);

  const activeVariants = product.variants.filter((variant) => variant.isActive !== false);
  const lowest = activeVariants.length
    ? Math.min(...activeVariants.map((variant) => priceInclGst(variant.price, variant.gst)))
    : 0;
  const compare = activeVariants.length
    ? Math.max(...activeVariants.map((variant) => variant.compareAtPrice ? priceInclGst(variant.compareAtPrice, variant.gst) : 0))
    : 0;
  const discount = getDiscountPercent(lowest, compare);
  const availableVariant = activeVariants.find((variant) => variant.stock > 0);
  const outOfStock = isProductOutOfStock(product);
  const href = `/products/${product.slug}`;
  const tag =
    badgeLabel === undefined
      ? product.sale?.badgeLabel || product.tags?.find((value) => /new|best|seller/i.test(value)) || (product.isFeatured ? "The edit" : "")
      : badgeLabel || "";

  const requireSignIn = () => router.push(`/login?redirect=${encodeURIComponent(href)}`);

  const toggleWishlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (onWishlistToggle) return onWishlistToggle(product._id);
    if (!isAuthenticated) return requireSignIn();
    if (actionBusy) return;
    setActionBusy(true);
    const result = await addToWishlist(product._id, availableVariant?._id);
    setWishlisted(true);
    toast(result.success ? "Saved to your wishlist" : result.message || "This piece is already saved", result.success ? "success" : "info");
    setActionBusy(false);
  };

  const quickAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    if (onAddToCart) return onAddToCart(product._id);
    if (!isAuthenticated) return requireSignIn();
    if (!availableVariant || actionBusy || addToCartDisabled) return;
    setActionBusy(true);
    const result = await addToCart(product._id, availableVariant._id, 1);
    toast(result.message, result.success ? "success" : "error");
    setActionBusy(false);
  };

  return (
    <article className={`group relative ${busy ? "pointer-events-none opacity-55" : ""}`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE9E0]">
        <Link href={unavailable ? "#" : href} aria-label={`View ${product.title}`} className="absolute inset-0">
          <Image
            src={getProductImage(product.images)}
            alt={product.images?.[0]?.alt || product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] ${unavailable ? "grayscale" : ""}`}
          />
        </Link>
        {tag && (
          <span className="absolute left-3 top-3 bg-background/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
            {tag}
          </span>
        )}
        <button
          type="button"
          onClick={toggleWishlist}
          disabled={actionBusy}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:text-primary disabled:opacity-50"
        >
          <Heart className={`size-[18px] stroke-[1.5] ${wishlisted ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
        </button>
        {!unavailable && (
          <button
            type="button"
            onClick={quickAdd}
            disabled={!availableVariant || actionBusy || addToCartDisabled}
            className="absolute inset-x-3 bottom-3 flex min-h-11 translate-y-2 items-center justify-center gap-2 bg-background/94 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground opacity-0 backdrop-blur transition-all duration-200 hover:bg-foreground hover:text-background focus:translate-y-0 focus:opacity-100 disabled:hidden group-hover:translate-y-0 group-hover:opacity-100"
            aria-label={`Quick add ${product.title}`}
          >
            <Plus className="size-4" aria-hidden="true" /> Quick add
          </button>
        )}
        {(unavailable || outOfStock) && (
          <span className="absolute inset-x-3 bottom-3 bg-foreground/85 px-3 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-background">
            {unavailable ? "Unavailable" : "Currently unavailable"}
          </span>
        )}
      </div>

      <div className="pt-4">
        {product.category?.name && (
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">{product.category.name}</p>
        )}
        <Link href={href}>
          <h3 className="line-clamp-2 font-display text-lg font-medium leading-tight text-foreground transition-colors hover:text-primary sm:text-xl">
            {product.title}
          </h3>
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className={outOfStock ? "text-muted" : "text-foreground"}>
            {unavailable ? "—" : outOfStock ? "Out of stock" : formatPrice(lowest)}
          </span>
          {!unavailable && !outOfStock && compare > lowest && (
            <span className="text-xs text-muted line-through">{formatPrice(compare)}</span>
          )}
          {!unavailable && discount > 0 && <span className="text-xs text-primary">Save {discount}%</span>}
        </div>
        {status && <p className={`mt-1 text-xs ${status.tone === "danger" ? "text-danger" : "text-success"}`}>{status.label}</p>}
      </div>
    </article>
  );
}
