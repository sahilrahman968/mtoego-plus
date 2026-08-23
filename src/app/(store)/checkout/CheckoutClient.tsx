"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CreditCard,
  Shield,
  Truck,
  RotateCcw,
  ChevronRight,
  Loader2,
  Lock,
  ArrowLeft,
  Tag,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import { initiateCheckout, verifyPayment } from "@/lib/store-api";
import {
  formatPrice,
  getProductImage,
  getVariantLabel,
  generateIdempotencyKey,
  isProductUnavailable,
} from "@/lib/utils";
import { buildCartSummary, priceInclGst } from "@/lib/pricing";
import { isCouponLineEligible } from "@/lib/coupons/eligibility";

interface ShippingForm {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Chandigarh", "Puducherry",
];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayLoader: Promise<void> | null = null;

function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only load in the browser"));
  }
  if (window.Razorpay) return Promise.resolve();
  if (razorpayLoader) return razorpayLoader;

  razorpayLoader = new Promise<void>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = RAZORPAY_SRC;
    el.async = true;
    el.onload = () =>
      window.Razorpay
        ? resolve()
        : reject(new Error("Razorpay script loaded without an SDK"));
    el.onerror = () => reject(new Error("Failed to load the Razorpay script"));
    document.body.appendChild(el);
  });

  // Allow a later attempt to retry from scratch instead of reusing a failed load.
  razorpayLoader.catch(() => {
    razorpayLoader = null;
  });

  return razorpayLoader;
}

export default function CheckoutClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, cart, applyCoupon, removeCoupon, refresh: refreshCart } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<"address" | "review">("address");
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [address, setAddress] = useState<ShippingForm>({
    name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    loadRazorpay().catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setAddress((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
      }));
    }
  }, [user]);

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
    const coupon = cart?.coupon;
    const lineItems = availableItems.map((item) => {
      const variant = item.product!.variants?.find((v) => v._id === item.variant);
      const rawCategory = (item.product as { category?: string | { _id?: string } } | null)
        ?.category;
      const categoryId =
        typeof rawCategory === "string"
          ? rawCategory
          : rawCategory?._id || null;
      return {
        price: variant?.price || item.priceAtAdd,
        quantity: item.quantity,
        gst: variant?.gst ?? 18,
        couponEligible: isCouponLineEligible({
          productId: item.product!._id,
          categoryId,
          applicableProducts: coupon?.applicableProducts,
          applicableCategories: coupon?.applicableCategories,
          excludedProducts: coupon?.excludedProducts,
        }),
      };
    });

    return buildCartSummary(
      lineItems,
      coupon
        ? {
            type: coupon.type,
            value: coupon.value,
            maxDiscount: coupon.maxDiscount ?? null,
          }
        : null
    );
  }, [availableItems, cart?.coupon]);

  const { subtotal, discount, shipping, gst, grandTotal: estimatedTotal } = summary;
  const shippingCost = shipping.cost;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || couponLoading) return;
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
    if (couponLoading) return;
    setCouponLoading(true);
    const res = await removeCoupon();
    if (res.success) toast("Coupon removed", "success");
    else toast(res.message, "error");
    setCouponLoading(false);
  };

  const validateAddress = (): boolean => {
    if (!address.name.trim()) { toast("Name is required", "error"); return false; }
    if (!address.phone.trim() || address.phone.length < 10) { toast("Valid phone number is required", "error"); return false; }
    if (!address.line1.trim()) { toast("Address line 1 is required", "error"); return false; }
    if (!address.city.trim()) { toast("City is required", "error"); return false; }
    if (!address.state) { toast("State is required", "error"); return false; }
    if (!address.pincode.trim() || !/^\d{6}$/.test(address.pincode)) { toast("Valid 6-digit pincode is required", "error"); return false; }
    return true;
  };

  const handleProceedToReview = () => {
    if (hasUnavailableItems || hasOutOfStockItems) {
      toast("Remove unavailable or out-of-stock products before checkout", "error");
      return;
    }
    if (availableItems.length === 0) {
      toast("Your cart has no available items", "error");
      return;
    }
    if (validateAddress()) setStep("review");
  };

  const handlePayment = async () => {
    if (
      hasUnavailableItems ||
      hasOutOfStockItems ||
      availableItems.length === 0
    ) {
      toast("Remove unavailable or out-of-stock products before payment", "error");
      return;
    }

    setLoading(true);

    try {
      await loadRazorpay();
    } catch {
      toast("Could not load the payment gateway. Check your connection and try again.", "error");
      setLoading(false);
      return;
    }

    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await initiateCheckout({
        idempotencyKey,
        shippingAddress: {
          name: address.name.trim(),
          phone: address.phone.trim(),
          line1: address.line1.trim(),
          line2: address.line2.trim() || undefined,
          city: address.city.trim(),
          state: address.state,
          pincode: address.pincode.trim(),
        },
      });

      if (!res.success || !res.data) {
        toast(res.message || "Checkout failed", "error");
        setLoading(false);
        return;
      }

      const { razorpayOrderId, amount, currency, key, orderNumber, orderId } = res.data;

      const options = {
        key,
        amount,
        currency,
        name: "Motoego+",
        description: `Order ${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: address.name,
          email: user?.email || "",
          contact: address.phone,
        },
        theme: { color: "#e32d22" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              await refreshCart();
              router.push(
                `/order-success?orderId=${orderId}&orderNumber=${orderNumber}`
              );
            } else {
              toast("Payment verification failed. Contact support.", "error");
            }
          } catch {
            toast("Payment verification error. Your payment is safe - contact support.", "error");
          }
          setLoading(false);
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast("Payment cancelled", "info");
          },
        },
      };

      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Razorpay SDK unavailable");

      const rzp = new Razorpay(options);
      rzp.open();
    } catch {
      toast("Checkout failed. Please try again.", "error");
      setLoading(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <Lock size={48} className="mx-auto mb-4 text-muted/45" />
        <h1 className="text-3xl text-foreground">Login Required</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Please login to proceed with checkout</p>
        <Link
          href="/login?redirect=/checkout"
          className="btn-text mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !authLoading) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <CreditCard size={48} className="mx-auto mb-4 text-muted/45" />
        <h1 className="text-3xl text-foreground">Nothing to checkout</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Your cart is empty</p>
        <Link
          href="/products"
          className="btn-text mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  const fieldClassName =
    "w-full min-w-0 max-w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary";

  return (
    <>
      <div className="mx-auto w-full min-w-0 max-w-[92rem] overflow-x-clip px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
        {/* Progress steps */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 border-b border-border/60 pb-6 sm:gap-3">
          <div
            className={`label-text flex items-center gap-2 ${
              step === "address" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`tabular flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-semibold leading-none ${
                step === "address"
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-muted"
              }`}
            >
              1
            </div>
            Shipping
          </div>
          <ChevronRight size={16} className="shrink-0 text-muted" />
          <div
            className={`label-text flex items-center gap-2 ${
              step === "review" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`tabular flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-semibold leading-none ${
                step === "review"
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-muted"
              }`}
            >
              2
            </div>
            Review & Pay
          </div>
        </div>

        <div className="grid min-w-0 gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="min-w-0 lg:col-span-2">
            {step === "address" ? (
              <div className="border border-border bg-card/80 p-4 sm:p-6">
                <div className="mb-6 flex items-center gap-2">
                  <MapPin size={20} className="shrink-0 text-primary" />
                  <h2 className="section-title text-lg text-foreground">
                    Shipping Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className="label-text mb-2 block text-muted">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="label-text mb-2 block text-muted">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      placeholder="10-digit mobile number"
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <label className="label-text mb-2 block text-muted">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House no., Building, Street"
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <label className="label-text mb-2 block text-muted">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      placeholder="Area, Landmark (optional)"
                      className={fieldClassName}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="label-text mb-2 block text-muted">
                      City *
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="label-text mb-2 block text-muted">
                      State *
                    </label>
                    <select
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className={fieldClassName}
                      required
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="label-text mb-2 block text-muted">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                      }
                      placeholder="6-digit pincode"
                      className={fieldClassName}
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleProceedToReview}
                  className="btn-text mt-7 flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-white transition-colors hover:bg-primary-dark"
                >
                  Continue to Review
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="min-w-0 space-y-6">
                {/* Shipping summary */}
                <div className="border border-border bg-card/80 p-4 sm:p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin size={18} className="shrink-0 text-primary" />
                      <h3 className="section-title text-base text-foreground">Shipping To</h3>
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="btn-text shrink-0 text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="break-words text-sm font-medium leading-relaxed text-foreground">{address.name}</p>
                  <p className="meta-text break-words text-muted">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="meta-text break-words text-muted">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="meta-text tabular text-muted">Phone: {address.phone}</p>
                </div>

                {/* Cart items */}
                <div className="border border-border bg-card/80 p-4 sm:p-6">
                  <h3 className="section-title mb-4 text-base text-foreground">
                    Order Items ({items.length})
                  </h3>
                  {(hasUnavailableItems || hasOutOfStockItems) && (
                    <div className="meta-text mb-3 border border-danger/40 bg-danger/10 px-3 py-2.5 text-danger">
                      Some items are unavailable or out of stock.{" "}
                      <Link href="/cart" className="underline hover:text-danger">
                        Return to cart
                      </Link>{" "}
                      to remove them.
                    </div>
                  )}
                  <div className="space-y-3">
                    {items.map((item) => {
                      const unavailable = isProductUnavailable(item.product);
                      const product = item.product;
                      const variant = product?.variants?.find(
                        (v) => v._id === item.variant
                      );
                      const outOfStock =
                        !unavailable && !!variant && variant.stock <= 0;
                      const price = variant?.price || item.priceAtAdd;
                      const displayPrice = priceInclGst(price, variant?.gst);
                      const title = product?.title || "Product unavailable";
                      return (
                        <div
                          key={item._id}
                          className={`flex gap-3 ${unavailable ? "opacity-70" : ""}`}
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-border bg-black/45">
                            <Image
                              src={getProductImage(product?.images)}
                              alt={title}
                              fill
                              sizes="56px"
                              className={`object-cover ${unavailable ? "grayscale" : ""}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium leading-snug text-foreground">
                              {title}
                            </p>
                            {unavailable ? (
                              <p className="eyebrow-xs mt-0.5 text-danger">
                                Product unavailable
                              </p>
                            ) : (
                              <p className="meta-text tabular mt-0.5 text-muted">
                                {variant ? getVariantLabel(variant) : ""} × {item.quantity}
                              </p>
                            )}
                          </div>
                          {!unavailable && (
                            <p
                              className={`price shrink-0 text-sm ${
                                outOfStock ? "font-normal text-danger" : "font-medium text-foreground"
                              }`}
                            >
                              {outOfStock
                                ? "Out of stock"
                                : formatPrice(displayPrice * item.quantity)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment button */}
                <button
                  onClick={handlePayment}
                  disabled={
                    loading ||
                    hasUnavailableItems ||
                    hasOutOfStockItems ||
                    availableItems.length === 0
                  }
                  className="btn-text flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Lock size={18} />
                      Pay {formatPrice(estimatedTotal)}
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep("address")}
                  className="label-text flex items-center gap-2 text-muted transition-colors hover:text-foreground"
                >
                  <ArrowLeft size={16} />
                  Back to Shipping
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="min-w-0 lg:col-span-1">
            <div className="sticky top-28 border border-border bg-card/90 p-4 sm:p-6">
              <h2 className="section-title mb-5 text-lg text-foreground">
                Order Summary
              </h2>
              <div className="tabular space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-muted">
                    Subtotal (excl. GST)
                  </span>
                  <span className="shrink-0 font-medium">{formatPrice(subtotal)}</span>
                </div>
                {cart?.coupon && discount > 0 && (
                  <div className="flex items-start justify-between gap-3 text-success">
                    <span className="flex min-w-0 items-center gap-1">
                      <Tag size={14} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{cart.coupon.code}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        disabled={couponLoading}
                        className="ml-1 shrink-0 text-muted transition-colors hover:text-danger disabled:opacity-50"
                        aria-label={`Remove coupon ${cart.coupon.code}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                    <span className="shrink-0">-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-muted">GST ({gst.gstLabel})</span>
                  <span className="shrink-0 font-medium">{formatPrice(gst.totalTax)}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-muted">Shipping</span>
                  <span className={`shrink-0 ${shippingCost === 0 ? "font-medium text-success" : ""}`}>
                    {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex items-start justify-between gap-3 text-base font-bold">
                  <span className="min-w-0">Estimated Total</span>
                  <span className="shrink-0">{formatPrice(estimatedTotal)}</span>
                </div>
                <p className="eyebrow-xs text-muted">Total includes GST</p>
              </div>

              {!cart?.coupon && availableItems.length > 0 && (
                <div className="mt-4 min-w-0">
                  <label htmlFor="checkout-coupon" className="label-text mb-2 block text-muted">
                    Coupon code
                  </label>
                  <div className="flex min-w-0 gap-2">
                    <input
                      id="checkout-coupon"
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter code"
                      autoComplete="off"
                      className="min-w-0 flex-1 border border-border bg-black/55 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="button"
                      onClick={() => void handleApplyCoupon()}
                      disabled={couponLoading || !couponCode.trim()}
                      className="btn-text shrink-0 border border-border bg-black/50 px-3 py-2.5 text-foreground transition-colors hover:border-accent disabled:opacity-50 sm:px-4"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 border border-border bg-black/45 p-3">
                <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
                <p className="meta-text min-w-0 break-words text-muted">
                  Your payment is secured with Razorpay&apos;s 256-bit encryption
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 border-y border-border/70 py-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Free Shipping", desc: "On orders above ₹999" },
            { icon: Shield, title: "Secure Payment", desc: "100% secure checkout" },
            { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
            { icon: CreditCard, title: "Multiple Payment", desc: "UPI, Cards, Net Banking" },
          ].map((item) => (
            <div key={item.title} className="flex min-w-0 items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-primary/30 bg-primary/10">
                <item.icon size={14} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="label-text break-words text-foreground">{item.title}</p>
                <p className="meta-text mt-0.5 break-words text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
