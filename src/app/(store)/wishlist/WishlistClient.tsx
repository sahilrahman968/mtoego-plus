"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/jewellery/shared/Toast";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistItemData,
} from "@/lib/store-api";
import { isProductUnavailable } from "@/lib/utils";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { ProductCardSkeleton } from "@/components/jewellery/shared/Skeletons";

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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <Heart size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Saved for later</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">Your Wishlist</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Sign in to revisit the pieces that caught your eye.</p>
        <Link
          href="/login?redirect=/wishlist"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Login to Continue
        </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-3 border-b border-border pb-6">
          <div className="h-3 w-24 animate-pulse bg-card-hover" />
          <div className="h-10 w-56 animate-pulse bg-card-hover" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-10 lg:grid-cols-4 lg:gap-14">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <Heart size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Curate your collection</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">
          Your wishlist is empty
        </h1>
        <p className="body-copy mx-auto mt-3 text-muted">
          Keep the pieces you love close while you consider your selection.
        </p>
        <Link
          href="/products"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Explore the collection
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <header className="mb-8 border-b border-border pb-6 sm:mb-12">
        <p className="eyebrow mb-3 text-primary">Saved for later</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="section-title text-4xl text-foreground sm:text-5xl">Your Wishlist</h1>
          <p className="eyebrow-xs tabular pb-1 text-muted">{items.length} piece{items.length === 1 ? "" : "s"}</p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-4 sm:gap-10 lg:grid-cols-4 lg:gap-14">
        {items.map((item) => {
          const product = item.product;
          const unavailable = isProductUnavailable(product);
          const isRemoving = removingIds.has(item._id);
          const isOutOfStock =
            !unavailable &&
            !!product &&
            !product.variants?.some(
              (variant) => variant.isActive !== false && variant.stock > 0
            );

          return (
            <ProductCard
              key={item._id}
              product={
                product ?? {
                  _id: item._id,
                  title: "Product unavailable",
                  slug: "",
                  images: [],
                  variants: [],
                }
              }
              unavailable={unavailable}
              busy={isRemoving}
              isWishlisted
              onWishlistToggle={() => handleRemove(item._id)}
              onAddToCart={() => handleMoveToCart(item)}
              addToCartDisabled={isRemoving || isOutOfStock}
              status={{
                label: unavailable
                  ? "Unavailable"
                  : isOutOfStock
                    ? "Out of stock"
                    : "In stock",
                tone: unavailable || isOutOfStock ? "danger" : "success",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
