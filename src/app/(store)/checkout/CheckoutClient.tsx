"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  CreditCard,
  Shield,
  ChevronRight,
  Loader2,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/jewellery/shared/Toast";
import { initiateCheckout, verifyPayment } from "@/lib/store-api";
import {
  formatPrice,
  getProductImage,
  getVariantLabel,
  generateIdempotencyKey,
  isProductUnavailable,
} from "@/lib/utils";
import { buildCartSummary, priceInclGst } from "@/lib/pricing";
import { theme } from "@/config/theme";

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
  const { items, cart, refresh: refreshCart } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<"address" | "review">("address");
  const [loading, setLoading] = useState(false);
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
    const lineItems = availableItems.map((item) => {
      const variant = item.product!.variants?.find((v) => v._id === item.variant);
      return {
        price: variant?.price || item.priceAtAdd,
        quantity: item.quantity,
        gst: variant?.gst ?? 18,
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
        name: theme.brand.name,
        description: `Order ${orderNumber}`,
        order_id: razorpayOrderId,
        prefill: {
          name: address.name,
          email: user?.email || "",
          contact: address.phone,
        },
        theme: { color: "#A16207" },
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
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <Lock size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Secure checkout</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">Login Required</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Sign in to continue with your order.</p>
        <Link
          href="/login?redirect=/checkout"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Login to Continue
        </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !authLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <CreditCard size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Checkout</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">Nothing to checkout</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Your cart is empty</p>
        <Link
          href="/products"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary"
        >
          Explore the collection
        </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[92rem] px-4 py-8 pb-28 sm:px-6 sm:py-12 sm:pb-12 lg:px-8">
        <header className="mb-8 text-center">
          <p className="eyebrow mb-3 text-primary">Complete your order</p>
          <h1 className="section-title text-4xl text-foreground sm:text-5xl">Checkout</h1>
        </header>
        {/* Progress steps */}
        <div className="mb-10 flex items-center justify-center gap-3 border-b border-border pb-7" aria-label="Checkout progress">
          <div
            className={`label-text flex items-center gap-2 ${
              step === "address" ? "text-foreground" : "text-muted"
            }`}
          >
            <div
              className={`tabular flex h-6 w-6 items-center justify-center text-[11px] font-semibold leading-none ${
                step === "address"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted"
              }`}
            >
              1
            </div>
            Shipping
          </div>
          <ChevronRight size={16} className="text-muted" />
          <div
            className={`label-text flex items-center gap-2 ${
              step === "review" ? "text-foreground" : "text-muted"
            }`}
          >
            <div
              className={`tabular flex h-6 w-6 items-center justify-center text-[11px] font-semibold leading-none ${
                step === "review"
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted"
              }`}
            >
              2
            </div>
            Review & Pay
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === "address" ? (
              <div className="border border-border bg-card p-5 shadow-[0_18px_50px_rgba(61,45,24,0.06)] sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={20} className="text-primary" />
                  <h2 className="section-title text-lg text-foreground">
                    Shipping Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="checkout-name" className="label-text mb-2 block text-muted">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="checkout-name"
                      autoComplete="name"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-phone" className="label-text mb-2 block text-muted">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="checkout-phone"
                      autoComplete="tel"
                      inputMode="numeric"
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      placeholder="10-digit mobile number"
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-line1" className="label-text mb-2 block text-muted">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      id="checkout-line1"
                      autoComplete="address-line1"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House no., Building, Street"
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-line2" className="label-text mb-2 block text-muted">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      id="checkout-line2"
                      autoComplete="address-line2"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      placeholder="Area, Landmark (optional)"
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-city" className="label-text mb-2 block text-muted">
                      City *
                    </label>
                    <input
                      type="text"
                      id="checkout-city"
                      autoComplete="address-level2"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-state" className="label-text mb-2 block text-muted">
                      State *
                    </label>
                    <select
                      id="checkout-state"
                      autoComplete="address-level1"
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
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
                  <div>
                    <label htmlFor="checkout-pincode" className="label-text mb-2 block text-muted">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      id="checkout-pincode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                      }
                      placeholder="6-digit pincode"
                      className="w-full border border-border bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleProceedToReview}
                  className="btn-text mt-8 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 bg-foreground px-6 py-4 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Continue to Review
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Shipping summary */}
                <div className="border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-primary" />
                      <h3 className="section-title text-base text-foreground">Shipping To</h3>
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="btn-text text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-foreground">{address.name}</p>
                  <p className="meta-text text-muted">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="meta-text text-muted">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="meta-text tabular text-muted">Phone: {address.phone}</p>
                </div>

                {/* Cart items */}
                <div className="border border-border bg-card p-6">
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
                          className={`flex gap-3 border-b border-border py-3 last:border-0 ${unavailable ? "opacity-70" : ""}`}
                        >
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[#EEE9E0]">
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
                  className="btn-text hidden min-h-12 w-full cursor-pointer items-center justify-center gap-2 bg-foreground px-6 py-4 text-background transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 lg:flex"
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
          <div className="lg:col-span-1">
            <div className="sticky top-28 border border-border bg-[#F7F2E9] p-6 shadow-[0_18px_50px_rgba(61,45,24,0.08)]">
              <h2 className="section-title mb-5 text-lg text-foreground">
                Order Summary
              </h2>
              <div className="tabular space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">
                    Subtotal (excl. GST)
                  </span>
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
                  <span className={shippingCost === 0 ? "text-success font-medium" : ""}>
                    {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                  </span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Estimated Total</span>
                  <span>{formatPrice(estimatedTotal)}</span>
                </div>
                <p className="eyebrow-xs text-muted">Total includes GST</p>
              </div>

              <div className="mt-5 flex items-center gap-2 border border-primary/20 bg-primary/5 p-3">
                <Shield size={16} className="shrink-0 text-primary" />
                <p className="meta-text text-muted">
                  Payment is completed through Razorpay.
                </p>
              </div>
            </div>
          </div>
        </div>

        {step === "review" && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 shadow-[0_-10px_30px_rgba(61,45,24,0.1)] backdrop-blur lg:hidden">
            <button
              onClick={handlePayment}
              disabled={loading || hasUnavailableItems || hasOutOfStockItems || availableItems.length === 0}
              className="btn-text flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 bg-foreground px-6 py-3.5 text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" aria-label="Processing payment" /> : <><Lock size={17} aria-hidden="true" />Pay {formatPrice(estimatedTotal)}</>}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
