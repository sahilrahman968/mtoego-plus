"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistItemData,
} from "@/lib/store-api";
import { formatPrice, getProductImage, isProductUnavailable } from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import { WishlistCardSkeleton } from "@/components/store/skeletons";

export default function WishlistClient() {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    void getWishlist().then((res) => {
      if (cancelled) return;
      if (res.success && res.data) {
        // Keep inactive products so customers can see "unavailable";
        // drop only orphaned refs with no product document left.
        setItems(res.data.items || []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleRemove = async (itemId: string) => {
    setRemovingIds((prev) => new Set(prev).add(itemId));
    const res = await removeFromWishlist(itemId);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i._id !== itemId));
      toast("Removed from wishlist", "success");
    } else {
      toast(res.message || "Failed to remove", "error");
    }
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleMoveToCart = async (item: WishlistItemData) => {
    if (isProductUnavailable(item.product) || !item.product) {
      toast("This product is no longer available", "error");
      return;
    }
    const firstActiveVariant = item.product.variants?.find(
      (v) => v.isActive !== false && v.stock > 0
    );
    if (!firstActiveVariant) {
      toast("This product is currently out of stock", "error");
      return;
    }
    const res = await addToCart(item.product._id, firstActiveVariant._id, 1);
    if (res.success) {
      await handleRemove(item._id);
      toast("Moved to cart!", "success");
    } else {
      toast(res.message, "error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Heart size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Your Wishlist</h1>
        <p className="text-muted mt-2">Please login to view your wishlist</p>
        <Link
          href="/login?redirect=/wishlist"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 justify-center gap-6 sm:grid-cols-[repeat(auto-fit,minmax(260px,290px))]">
          {Array.from({ length: 4 }).map((_, i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Heart size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">
          Your wishlist is empty
        </h1>
        <p className="text-muted mt-2">
          Save items you love to your wishlist
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Explore Products
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="grid grid-cols-1 justify-center gap-6 sm:grid-cols-[repeat(auto-fit,minmax(260px,290px))]">
        {items.map((item) => {
          const product = item.product;
          const unavailable = isProductUnavailable(product);
          const title = product?.title || "Product unavailable";
          const lowestPrice = (() => {
            if (!product || unavailable) return null;
            const active = product.variants?.filter((v) => v.isActive !== false) ?? [];
            if (active.length > 0) {
              return Math.min(...active.map((v) => priceInclGst(v.price, v.gst)));
            }
            return product.priceRange?.min
              ? priceInclGst(product.priceRange.min, 18)
              : 0;
          })();
          const isRemoving = removingIds.has(item._id);
          const isOutOfStock =
            !unavailable &&
            !!product &&
            !product.variants?.some(
              (variant) => variant.isActive !== false && variant.stock > 0
            );

          return (
            <article
              key={item._id}
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/85 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition-all duration-300 ${
                unavailable
                  ? "opacity-80"
                  : "hover:-translate-y-1 hover:border-primary/45 hover:shadow-[0_22px_60px_rgba(0,0,0,0.4)]"
              } ${isRemoving ? "opacity-50" : ""}`}
            >
              {unavailable || !product ? (
                <div className="relative block aspect-square overflow-hidden bg-white">
                  <Image
                    src={getProductImage(product?.images)}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, 290px"
                    className="object-contain p-3 grayscale"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    <span className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                      Product unavailable
                    </span>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/products/${product.slug}`}
                  className="relative block aspect-square overflow-hidden bg-white"
                >
                  <Image
                    src={getProductImage(product.images)}
                    alt={title}
                    fill
                    sizes="(max-width: 640px) 100vw, 290px"
                    className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/15 to-transparent" />
                </Link>
              )}

              <button
                type="button"
                onClick={() => handleRemove(item._id)}
                disabled={isRemoving}
                aria-label={`Remove ${title} from wishlist`}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white/80 backdrop-blur-sm transition-colors hover:border-danger/60 hover:bg-danger hover:text-white disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex flex-1 flex-col p-4">
                {unavailable || !product ? (
                  <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-muted">
                    {title}
                  </h3>
                ) : (
                  <Link href={`/products/${product.slug}`} className="block">
                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-foreground transition-colors group-hover:text-primary">
                      {title}
                    </h3>
                  </Link>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <p className="text-lg font-bold tracking-tight text-foreground">
                    {lowestPrice != null ? formatPrice(lowestPrice) : "—"}
                  </p>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                      unavailable || isOutOfStock ? "text-danger" : "text-success"
                    }`}
                  >
                    {unavailable
                      ? "Unavailable"
                      : isOutOfStock
                        ? "Out of stock"
                        : "In stock"}
                  </span>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleMoveToCart(item)}
                    disabled={isRemoving || unavailable || isOutOfStock}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(227,45,34,0.22)] transition-all hover:bg-primary-dark hover:shadow-[0_10px_28px_rgba(227,45,34,0.32)] disabled:cursor-not-allowed disabled:bg-card-hover disabled:text-muted disabled:shadow-none"
                  >
                    <ShoppingCart size={17} />
                    {unavailable || isOutOfStock ? "Unavailable" : "Add to Cart"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
