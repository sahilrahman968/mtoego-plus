"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  ArrowRight,
  Truck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import {
  formatPrice,
  getProductImage,
  getVariantLabel,
  isProductUnavailable,
} from "@/lib/utils";
import { buildCartSummary, isCouponProductEligible, priceInclGst } from "@/lib/pricing";
import { CartItemSkeleton } from "@/components/store/skeletons";

export default function CartClient() {
  const { isAuthenticated } = useAuth();
  const { items, cart, updateItem, removeItem, isLoading } = useCart();
  const { toast } = useToast();
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

  const summary = useMemo(() => {
    const applicable = cart?.coupon?.applicableProducts;
    const lineItems = availableItems.map((item) => {
      const variant = item.product!.variants?.find((v) => v._id === item.variant);
      return {
        price: variant?.price || item.priceAtAdd,
        quantity: item.quantity,
        gst: variant?.gst ?? 18,
        couponEligible: isCouponProductEligible(
          item.product!._id,
          applicable
        ),
      };
    });

    return buildCartSummary(
      lineItems,
      cart?.coupon
        ? {
            type: cart.coupon.type,
            value: cart.coupon.value,
            maxDiscount: cart.coupon.maxDiscount ?? null,
          }
        : null
    );
  }, [availableItems, cart?.coupon]);

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

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <ShoppingCart size={48} className="mx-auto mb-4 text-muted/45" />
        <h1 className="text-2xl text-foreground">Your Cart</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Please login to view your cart</p>
        <Link
          href="/login?redirect=/cart"
          className="btn-text mt-6 inline-flex items-center gap-2 border border-primary/60 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
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
        <h1 className="text-2xl text-foreground">
          Your cart is empty
        </h1>
        <p className="body-copy mx-auto mt-3 text-muted">
          Looks like you haven&apos;t added any items to your cart yet.
        </p>
        <Link
          href="/products"
          className="btn-text mt-6 inline-flex items-center gap-2 border border-primary/60 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
        >
          Start Shopping
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {(hasUnavailableItems || hasOutOfStockItems) && (
        <div className="mb-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
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
                className={`flex gap-4 border border-border bg-card/50 p-4 transition-opacity ${
                  isUpdating ? "opacity-60" : ""
                } ${unavailable ? "opacity-75" : ""}`}
              >
                {/* Image */}
                {unavailable || !product ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-black/45 sm:h-24 sm:w-24">
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
                    className="relative h-20 w-20 shrink-0 overflow-hidden border border-border bg-black/45 sm:h-24 sm:w-24"
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
                      className="line-clamp-2 text-sm font-semibold uppercase leading-snug text-foreground transition-colors hover:text-primary"
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
                        <span className="tabular w-8 text-center text-sm font-medium text-foreground">
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
                    )}
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={isUpdating}
                      className="text-muted transition-colors hover:text-danger"
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
          <div className="sticky top-24 border border-border bg-card/85 p-5 sm:p-6">
            <h2 className="section-title mb-5 text-lg text-foreground">
              Order Summary
            </h2>

            {/* tabular figures keep the price column aligned row to row */}
            <div className="tabular space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal (excl. GST)</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>

              {cart?.coupon && discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Coupon ({cart.coupon.code})</span>
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
                <div className="meta-text flex items-center gap-2 border border-border bg-black/35 p-2.5 text-muted">
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

            {availableItems.length > 0 &&
            !hasUnavailableItems &&
            !hasOutOfStockItems ? (
              <Link
                href="/checkout"
                className="btn-text mt-5 flex w-full items-center justify-center gap-2 border border-primary/60 bg-primary px-6 py-4 text-white transition-colors hover:bg-primary-dark"
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
    </div>
  );
}
