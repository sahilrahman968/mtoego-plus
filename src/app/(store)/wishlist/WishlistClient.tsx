"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistItemData,
} from "@/lib/store-api";
import { isProductUnavailable } from "@/lib/utils";
import ProductCard from "@/components/store/ProductCard";
import { ProductCardSkeleton } from "@/components/store/skeletons";

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
