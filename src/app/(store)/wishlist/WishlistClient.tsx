"use client";

import { useEffect, useState, useCallback } from "react";
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
import { formatPrice, getProductImage } from "@/lib/utils";
import { WishlistCardSkeleton } from "@/components/store/skeletons";

export default function WishlistClient() {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [items, setItems] = useState<WishlistItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const loadWishlist = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    const res = await getWishlist();
    if (res.success && res.data) {
      setItems((res.data.items || []).filter((i: WishlistItemData) => i.product != null));
    }
    setLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

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
    if (!item.product) {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 h-8 w-48 animate-pulse-slow rounded bg-card-hover" />
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-14">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
        My Wishlist ({items.length})
      </h1>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-14">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const lowestPrice = product.priceRange?.min || product.variants?.[0]?.price || 0;
          const isRemoving = removingIds.has(item._id);

          return (
            <div
              key={item._id}
              className={`group bg-white rounded-xl border border-border overflow-hidden transition-all ${
                isRemoving ? "opacity-50" : ""
              }`}
            >
              <Link
                href={`/products/${product.slug}`}
                className="relative aspect-square block bg-gray-50 overflow-hidden"
              >
                <Image
                  src={getProductImage(product.images)}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </Link>
              <div className="p-3 sm:p-4">
                <Link href={`/products/${product.slug}`}>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                  </h3>
                </Link>
                <p className="text-base font-bold text-foreground mt-1">
                  {formatPrice(lowestPrice)}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    disabled={isRemoving}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <ShoppingCart size={14} />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => handleRemove(item._id)}
                    disabled={isRemoving}
                    className="w-9 h-9 flex items-center justify-center border border-border rounded-lg hover:bg-gray-50 hover:text-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
