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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Your Cart</h1>
        <p className="text-muted mt-2">Please login to view your cart</p>
        <Link
          href="/login?redirect=/cart"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 bg-gray-100 rounded w-48 animate-pulse-slow mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse-slow" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShoppingCart size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Your cart is empty</h1>
        <p className="text-muted mt-2">
          Looks like you haven&apos;t added any items to your cart yet.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Start Shopping
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Shopping Cart ({items.length})
        </h1>
        <button
          onClick={() => {
            clear();
            toast("Cart cleared", "success");
          }}
          className="text-sm text-danger hover:underline"
        >
          Clear All
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const variant = item.product.variants?.find(
              (v) => v._id === item.variant
            );
            const price = variant?.price || item.priceAtAdd;
            const isUpdating = updatingItems.has(item._id);

            return (
              <div
                key={item._id}
                className={`flex gap-4 p-4 bg-white rounded-xl border border-border transition-opacity ${
                  isUpdating ? "opacity-60" : ""
                }`}
              >
                {/* Image */}
                <Link
                  href={`/products/${item.product.slug}`}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-lg overflow-hidden bg-gray-50"
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
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.product.title}
                  </Link>
                  {variant && (
                    <p className="text-xs text-muted mt-0.5">
                      {getVariantLabel(variant)}
                    </p>
                  )}
                  <p className="text-base font-bold text-foreground mt-1">
                    {formatPrice(price)}
                  </p>

                  {/* Quantity + Remove */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="inline-flex items-center border border-border rounded-lg">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? handleUpdateQuantity(item._id, item.quantity - 1)
                            : handleRemoveItem(item._id)
                        }
                        disabled={isUpdating}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          handleUpdateQuantity(item._id, item.quantity + 1)
                        }
                        disabled={isUpdating}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      disabled={isUpdating}
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <div className="hidden sm:block text-right shrink-0">
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
          <div className="sticky top-28 bg-white rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
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
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-700">
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
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              </div>
            )}

            <Link
              href="/checkout"
              className="flex items-center justify-center gap-2 w-full mt-4 px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors"
            >
              Proceed to Checkout
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/products"
              className="block text-center mt-3 text-sm text-primary hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
