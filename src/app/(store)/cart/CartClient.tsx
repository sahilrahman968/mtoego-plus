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
import { useToast } from "@/components/jewellery/shared/Toast";
import {
  formatPrice,
  getProductImage,
  getVariantLabel,
  isProductUnavailable,
} from "@/lib/utils";
import { buildCartSummary, priceInclGst } from "@/lib/pricing";
import { CartItemSkeleton } from "@/components/jewellery/shared/Skeletons";

export default function CartClient() {
  const { isAuthenticated } = useAuth();
  const { items, cart, updateItem, removeItem, applyCoupon, removeCoupon, isLoading } =
    useCart();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const availableItems = useMemo(
    () => items.filter((item) => !isProductUnavailable(item.product)),
    [items]
  );
  const hasUnavailableItems = availableItems.length < items.length;
  const hasOutOfStockItems = availableItems.some((item) => {
    const variant = item.product?.variants?.find((v) => v._id === item.variant);
    return !!variant && variant.stock <= 0;
  });

  const lineItems = availableItems.map((item) => {
    const variant = item.product!.variants?.find((v) => v._id === item.variant);
    return {
      price: variant?.price || item.priceAtAdd,
      quantity: item.quantity,
      gst: variant?.gst ?? 18,
    };
  });
  const summary = buildCartSummary(
    lineItems,
    cart?.coupon
      ? {
          type: cart.coupon.type,
          value: cart.coupon.value,
          maxDiscount: cart.coupon.maxDiscount ?? null,
        }
      : null
  );

  const { subtotal, discount, shipping, gst, grandTotal: estimatedTotal } = summary;
  const shippingCost = shipping.cost;

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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <ShoppingCart size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Private collection</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">Your Cart</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Sign in to view the pieces saved in your cart.</p>
        <Link
          href="/login?redirect=/cart"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Login to Continue
        </Link>
        </div>
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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <ShoppingCart size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Your selection</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">
          Your cart is empty
        </h1>
        <p className="body-copy mx-auto mt-3 text-muted">
          Discover jewellery chosen to become part of your everyday ritual.
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
    <div className="mx-auto max-w-[92rem] px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
      <header className="mb-8 border-b border-border pb-6 sm:mb-10">
        <p className="eyebrow mb-3 text-primary">Your selection</p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="section-title text-4xl text-foreground sm:text-5xl">Shopping Cart</h1>
          <p className="eyebrow-xs tabular pb-1 text-muted">{items.length} item{items.length === 1 ? "" : "s"}</p>
        </div>
      </header>
      {(hasUnavailableItems || hasOutOfStockItems) && (
        <div role="alert" className="mb-6 border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-relaxed text-danger">
          Some items in your cart are unavailable or out of stock. Remove them to
          continue checkout.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => {
            const unavailable = isProductUnavailable(item.product);
            const product = item.product;
            const variant = product?.variants?.find((v) => v._id === item.variant);
            const outOfStock = !unavailable && !!variant && variant.stock <= 0;
            const price = variant?.price || item.priceAtAdd;
            const displayPrice = priceInclGst(price, variant?.gst);
            const isUpdating = updatingItems.has(item._id);
            const title = product?.title || "Product unavailable";
            const imageSrc = getProductImage(product?.images);

            return (
              <div
                key={item._id}
                className={`flex gap-4 border-b border-border bg-card px-1 py-5 transition-opacity sm:px-5 ${
                  isUpdating ? "opacity-60" : ""
                } ${unavailable ? "opacity-75" : ""}`}
              >
                {/* Image */}
                {unavailable || !product ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#EEE9E0] sm:h-28 sm:w-28">
                    <Image
                      src={imageSrc}
                      alt={title}
                      fill
                      sizes="96px"
                      className="object-cover grayscale"
                    />
                  </div>
                ) : (
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative h-20 w-20 shrink-0 overflow-hidden bg-[#EEE9E0] sm:h-28 sm:w-28"
                  >
                    <Image
                      src={imageSrc}
                      alt={title}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </Link>
                )}

                {/* Details */}
                <div className="flex-1 min-w-0">
                  {unavailable || !product ? (
                    <p className="line-clamp-2 text-sm font-semibold uppercase leading-snug text-muted">
                      {title}
                    </p>
                  ) : (
                    <Link
                      href={`/products/${product.slug}`}
                      className="line-clamp-2 font-display text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-xl"
                    >
                      {title}
                    </Link>
                  )}
                  {unavailable ? (
                    <p className="eyebrow-xs mt-1.5 text-danger">
                      Product unavailable
                    </p>
                  ) : (
                    variant && (
                      <p className="eyebrow-xs mt-1.5 text-muted">
                        {getVariantLabel(variant)}
                      </p>
                    )
                  )}
                  {/* Quantity + Remove */}
                  <div className="mt-2 flex items-center gap-4">
                    {!unavailable && !outOfStock && (
                      <div className="inline-flex items-center border border-border bg-background">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? handleUpdateQuantity(item._id, item.quantity - 1)
                              : handleRemoveItem(item._id)
                          }
                          disabled={isUpdating}
                          aria-label={`Decrease quantity of ${title}`}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="tabular w-8 text-center text-sm font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item._id, item.quantity + 1)
                          }
                          disabled={isUpdating}
                          aria-label={`Increase quantity of ${title}`}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={isUpdating}
                      aria-label={`Remove ${title} from cart`}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center text-muted transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {!unavailable && (
                    <p
                      className={`price mt-2 text-sm sm:hidden ${
                        outOfStock ? "font-normal text-danger" : "font-bold text-foreground"
                      }`}
                    >
                      {outOfStock
                        ? "Out of stock"
                        : formatPrice(displayPrice * item.quantity)}
                    </p>
                  )}
                </div>

                {/* Line total */}
                {!unavailable && (
                  <div className="hidden shrink-0 text-right sm:block">
                    <p
                      className={`price text-base ${
                        outOfStock ? "font-normal text-danger" : "font-bold text-foreground"
                      }`}
                    >
                      {outOfStock
                        ? "Out of stock"
                        : formatPrice(displayPrice * item.quantity)}
                    </p>
                    {!outOfStock && (
                      <p className="eyebrow-xs mt-1 text-muted">incl. GST</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-border bg-[#F7F2E9] p-5 shadow-[0_18px_50px_rgba(61,45,24,0.08)] sm:p-7">
            <h2 className="section-title mb-5 text-lg text-foreground">
              Order Summary
            </h2>

            {/* tabular figures keep the price column aligned row to row */}
            <div className="tabular space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal (excl. GST)</span>
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
                <span className="text-muted">GST ({gst.gstLabel})</span>
                <span className="font-medium">{formatPrice(gst.totalTax)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className={shippingCost === 0 ? "text-success font-medium" : "font-medium"}>
                  {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                </span>
              </div>

              {shippingCost > 0 && (
                <div className="meta-text flex items-center gap-2 border border-primary/20 bg-primary/5 p-2.5 text-muted">
                  <Truck size={14} />
                  Add {formatPrice(999 - subtotal)} more for free shipping
                </div>
              )}

              <hr className="border-border" />

              <div className="flex justify-between text-base font-bold">
                <span>Estimated Total</span>
                <span>{formatPrice(estimatedTotal)}</span>
              </div>
              <p className="eyebrow-xs text-muted">
                Total includes GST
              </p>
            </div>

            {/* Coupon Input */}
            {!cart?.coupon && availableItems.length > 0 && (
              <div className="mt-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="min-w-0 flex-1 border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="btn-text cursor-pointer border border-foreground bg-transparent px-4 py-2.5 text-foreground transition-colors hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              </div>
            )}

            {availableItems.length > 0 &&
            !hasUnavailableItems &&
            !hasOutOfStockItems ? (
              <Link
                href="/checkout"
                className="btn-text mt-5 hidden w-full items-center justify-center gap-2 bg-foreground px-6 py-4 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:flex"
              >
                Proceed to Checkout
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="btn-text mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 border border-border bg-card-hover px-6 py-4 text-muted"
              >
                {availableItems.length === 0
                  ? "No available items"
                  : "Remove unavailable items"}
              </button>
            )}

            <Link
              href="/products"
              className="btn-text mt-4 block text-center text-primary transition-colors hover:text-primary-dark"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
      {availableItems.length > 0 && !hasUnavailableItems && !hasOutOfStockItems && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-[0_-10px_30px_rgba(61,45,24,0.1)] backdrop-blur lg:hidden">
          <Link href="/checkout" className="btn-text flex min-h-12 w-full items-center justify-between bg-foreground px-5 py-3.5 text-background">
            <span>Proceed to Checkout</span>
            <span className="tabular flex items-center gap-2">{formatPrice(estimatedTotal)} <ArrowRight size={17} aria-hidden="true" /></span>
          </Link>
        </div>
      )}
    </div>
  );
}
