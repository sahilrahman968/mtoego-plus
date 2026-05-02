"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import { initiateCheckout, verifyPayment } from "@/lib/store-api";
import { formatPrice, getProductImage, getVariantLabel, generateIdempotencyKey } from "@/lib/utils";
import { calculateDiscount } from "@/lib/pricing";

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
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

export default function CheckoutClient() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, cart, refresh: refreshCart } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState<"address" | "review">("address");
  const [loading, setLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
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
    if (user) {
      setAddress((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
      }));
    }
  }, [user]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const variant = item.product.variants?.find((v) => v._id === item.variant);
      return sum + (variant?.price || item.priceAtAdd) * item.quantity;
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
    if (validateAddress()) setStep("review");
  };

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      toast("Payment gateway is loading, please wait...", "info");
      return;
    }

    setLoading(true);
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

      const rzp = new window.Razorpay(options);
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
        <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-foreground">Login Required</h1>
        <p className="text-muted mt-2">Please login to proceed with checkout</p>
        <Link
          href="/login?redirect=/checkout"
          className="mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
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
        <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-foreground">Nothing to checkout</h1>
        <p className="text-muted mt-2">Your cart is empty</p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
      />

      <div className="mx-auto w-full max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
        {/* Progress steps */}
        <div className="mb-8 flex items-center justify-center gap-3 border-b border-border/60 pb-6">
          <div
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] ${
              step === "address" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center text-[10px] ${
                step === "address"
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-muted"
              }`}
            >
              1
            </div>
            Shipping
          </div>
          <ChevronRight size={16} className="text-muted" />
          <div
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] ${
              step === "review" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center text-[10px] ${
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === "address" ? (
              <div className="border border-border bg-card/80 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={20} className="text-primary" />
                  <h2 className="text-lg font-bold uppercase tracking-[0.08em] text-foreground">
                    Shipping Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      placeholder="10-digit mobile number"
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House no., Building, Street"
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      placeholder="Area, Landmark (optional)"
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      City *
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      State *
                    </label>
                    <select
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
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
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                      }
                      placeholder="6-digit pincode"
                      className="w-full border border-border bg-black/55 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleProceedToReview}
                  className="mt-6 flex w-full items-center justify-center gap-2 bg-primary px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary-dark"
                >
                  Continue to Review
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Shipping summary */}
                <div className="border border-border bg-card/80 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-primary" />
                      <h3 className="font-semibold uppercase tracking-[0.08em] text-foreground">Shipping To</h3>
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-sm text-foreground">{address.name}</p>
                  <p className="text-sm text-muted">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {address.city}, {address.state} - {address.pincode}
                  </p>
                  <p className="text-sm text-muted">Phone: {address.phone}</p>
                </div>

                {/* Cart items */}
                <div className="border border-border bg-card/80 p-6">
                  <h3 className="mb-4 font-semibold uppercase tracking-[0.08em] text-foreground">
                    Order Items ({items.length})
                  </h3>
                  <div className="space-y-3">
                    {items.map((item) => {
                      const variant = item.product.variants?.find(
                        (v) => v._id === item.variant
                      );
                      const price = variant?.price || item.priceAtAdd;
                      return (
                        <div key={item._id} className="flex gap-3">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden border border-border bg-black/45">
                            <Image
                              src={getProductImage(item.product.images)}
                              alt={item.product.title}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {item.product.title}
                            </p>
                            <p className="text-xs text-muted">
                              {variant ? getVariantLabel(variant) : ""} × {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-foreground shrink-0">
                            {formatPrice(price * item.quantity)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment button */}
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
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
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
                >
                  <ArrowLeft size={16} />
                  Back to Shipping
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 border border-border bg-card/90 p-6">
              <h2 className="mb-4 text-lg font-bold uppercase tracking-[0.08em] text-foreground">
                Order Summary
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">
                    Items ({items.reduce((s, i) => s + i.quantity, 0)})
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
                  <span className="text-muted">Shipping</span>
                  <span className={shippingCost === 0 ? "text-success font-medium" : ""}>
                    {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted">
                  <span>GST</span>
                  <span>Calculated at payment</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Estimated Total</span>
                  <span>{formatPrice(estimatedTotal)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 border border-border bg-black/45 p-3">
                <Shield size={16} className="shrink-0 text-primary" />
                <p className="text-xs text-muted">
                  Your payment is secured with Razorpay&apos;s 256-bit encryption
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 border-y border-border/70 py-4 sm:grid-cols-4">
          {[
            { icon: Truck, title: "Free Shipping", desc: "On orders above ₹999" },
            { icon: Shield, title: "Secure Payment", desc: "100% secure checkout" },
            { icon: RotateCcw, title: "Easy Returns", desc: "7-day return policy" },
            { icon: CreditCard, title: "Multiple Payment", desc: "UPI, Cards, Net Banking" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center border border-primary/30 bg-primary/10">
                <item.icon size={14} className="text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">{item.title}</p>
                <p className="text-[10px] text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
