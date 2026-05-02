"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  Tag,
  X,
  ArrowRight,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import { formatPrice, getProductImage, getVariantLabel } from "@/lib/utils";
import { calculateDiscount } from "@/lib/pricing";
import { CartItemSkeleton } from "@/components/store/skeletons";

export default function CartClient() {
  const { isAuthenticated } = useAuth();
  const { items, cart, updateItem, removeItem, clear, applyCoupon, removeCoupon, isLoading } =
    useCart();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const variant = item.product.variants?.find(
        (v) => v._id === item.variant
      );
      const price = variant?.price || item.priceAtAdd;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const discount = useMemo(() => {
    if (!cart?.coupon) return 0;
    return calculateDiscount(subtotal, {
      type: cart.coupon.type,
      value: cart.coupon.value,
      maxDiscount: cart.coupon.maxDiscount ?? null,
    });
  }, [subtotal, cart?.coupon]);

  const subtotalAfterDiscount = subtotal - discount;
  const shippingCost = subtotalAfterDiscount >= 999 ? 0 : 79;
  const estimatedTotal = subtotalAfterDiscount + shippingCost;

  const handleUpdateQuantity = async (itemId: string, qty: number) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    const res = await updateItem(itemId, qty);
    if (!res.success) toast(res.message, "error");
    setUpdatingItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    const res = await removeItem(itemId);
    if (res.success) toast("Item removed", "success");
    else toast(res.message, "error");
    setUpdatingItems((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const res = await applyCoupon(couponCode.trim());
    if (res.success) {
      toast(res.message, "success");
      setCouponCode("");
    } else {
      toast(res.message, "error");
    }
    setCouponLoading(false);
  };

  const handleRemoveCoupon = async () => {
    const res = await removeCoupon();
    if (res.success) toast("Coupon removed", "success");
  };

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <ShoppingCart size={48} className="mx-auto mb-4 text-muted/45" />
        <h1 className="text-2xl font-bold uppercase tracking-[0.06em] text-foreground">Your Cart</h1>
        <p className="text-muted mt-2">Please login to view your cart</p>
        <Link
          href="/login?redirect=/cart"
          className="mt-6 inline-flex items-center gap-2 border border-primary/60 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-8 sm:px-4 lg:px-6">
        <div className="mb-8 h-8 w-48 animate-pulse-slow rounded bg-card-hover" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="border border-border bg-card/85 p-6">
            <div className="mb-4 h-5 w-36 animate-pulse-slow rounded bg-card-hover" />
            <div className="space-y-3">
              <div className="h-3 w-full animate-pulse-slow rounded bg-card-hover" />
              <div className="h-3 w-11/12 animate-pulse-slow rounded bg-card-hover" />
              <div className="h-3 w-10/12 animate-pulse-slow rounded bg-card-hover" />
              <div className="h-px w-full animate-pulse-slow rounded bg-card-hover" />
              <div className="h-10 w-full animate-pulse-slow rounded bg-card-hover" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <ShoppingCart size={48} className="mx-auto mb-4 text-muted/45" />
        <h1 className="text-2xl font-bold uppercase tracking-[0.06em] text-foreground">
          Your cart is empty
        </h1>
        <p className="text-muted mt-2">
          Looks like you haven&apos;t added any items to your cart yet.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 border border-primary/60 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
        >
          Start Shopping
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const variant = item.product.variants?.find(
              (v) => v._id === item.variant
            );
            const price = variant?.price || item.priceAtAdd;
            const isUpdating = updatingItems.has(item._id);

            return (
              <div
                key={item._id}
                className={`flex gap-4 border border-border bg-card/50 p-4 transition-opacity ${
                  isUpdating ? "opacity-60" : ""
                }`}
              >
                {/* Image */}
                <Link
                  href={`/products/${item.product.slug}`}
                  className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-black/45 sm:h-24 sm:w-24"
                >
                  <Image
                    src={getProductImage(item.product.images)}
                    alt={item.product.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="line-clamp-2 text-sm font-semibold uppercase tracking-[0.04em] text-foreground transition-colors hover:text-primary"
                  >
                    {item.product.title}
                  </Link>
                  {variant && (
                    <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-muted">
                      {getVariantLabel(variant)}
                    </p>
                  )}
                  {/* Quantity + Remove */}
                  <div className="mt-2 flex items-center gap-4">
                    <div className="inline-flex items-center border border-border bg-black/35">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? handleUpdateQuantity(item._id, item.quantity - 1)
                            : handleRemoveItem(item._id)
                        }
                        disabled={isUpdating}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-black/60"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item._id, item.quantity + 1)
                        }
                        disabled={isUpdating}
                        className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-black/60"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={isUpdating}
                      className="text-muted transition-colors hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm font-bold text-foreground sm:hidden">
                    {formatPrice(price * item.quantity)}
                  </p>
                </div>

                {/* Line total */}
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-base font-bold text-foreground">
                    {formatPrice(price * item.quantity)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-border bg-card/85 p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold uppercase tracking-[0.06em] text-foreground">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {/* Coupon discount */}
              {cart?.coupon && discount > 0 && (
                <div className="flex justify-between text-success">
                  <span className="flex items-center gap-1">
                    <Tag size={14} />
                    {cart.coupon.code}
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-muted hover:text-danger ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className={shippingCost === 0 ? "text-success font-medium" : "font-medium"}>
                  {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                </span>
              </div>

              {shippingCost > 0 && (
                <div className="flex items-center gap-2 border border-border bg-black/35 p-2 text-xs text-muted">
                  <Truck size={14} />
                  Add {formatPrice(999 - subtotal)} more for free shipping
                </div>
              )}

              <hr className="border-border" />

              <div className="flex justify-between text-base font-bold">
                <span>Estimated Total</span>
                <span>{formatPrice(estimatedTotal)}</span>
              </div>
              <p className="text-[11px] text-muted">
                GST will be calculated at checkout
              </p>
            </div>

            {/* Coupon Input */}
            {!cart?.coupon && (
              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    className="flex-1 border border-border bg-black/45 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 text-sm font-medium border border-border bg-black/50 text-foreground transition-colors hover:border-accent disabled:opacity-50"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              </div>
            )}

            <Link
              href="/checkout"
              className="mt-4 flex w-full items-center justify-center gap-2 border border-primary/60 bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary-dark"
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/products"
              className="mt-3 block text-center text-xs font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:text-primary-dark"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
