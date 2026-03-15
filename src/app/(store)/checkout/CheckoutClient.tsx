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
        theme: { color: "#111827" },
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Lock size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Login Required</h1>
        <p className="text-muted mt-2">Please login to proceed with checkout</p>
        <Link
          href="/login?redirect=/checkout"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Nothing to checkout</h1>
        <p className="text-muted mt-2">Your cart is empty</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              step === "address" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step === "address"
                  ? "bg-primary text-white"
                  : "bg-primary-light text-primary"
              }`}
            >
              1
            </div>
            Shipping
          </div>
          <ChevronRight size={16} className="text-muted" />
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              step === "review" ? "text-primary" : "text-muted"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                step === "review"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-muted"
              }`}
            >
              2
            </div>
            Review & Pay
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {step === "address" ? (
              <div className="bg-white rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-6">
                  <MapPin size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">
                    Shipping Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })
                      }
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      placeholder="House no., Building, Street"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={address.line2}
                      onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                      placeholder="Area, Landmark (optional)"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      City *
                    </label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      State *
                    </label>
                    <select
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                      }
                      placeholder="6-digit pincode"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <button
                  onClick={handleProceedToReview}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors"
                >
                  Continue to Review
                  <ChevronRight size={18} />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Shipping summary */}
                <div className="bg-white rounded-xl border border-border p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-primary" />
                      <h3 className="font-semibold text-foreground">Shipping To</h3>
                    </div>
                    <button
                      onClick={() => setStep("address")}
                      className="text-sm text-primary hover:underline"
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
                <div className="bg-white rounded-xl border border-border p-6">
                  <h3 className="font-semibold text-foreground mb-4">
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
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 shrink-0">
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
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50"
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
                  className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Shipping
                </button>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-white rounded-xl border border-border p-6">
              <h2 className="text-lg font-bold text-foreground mb-4">
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

              <div className="mt-4 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Shield size={16} className="text-gray-700 shrink-0" />
                <p className="text-xs text-gray-700">
                  Your payment is secured with Razorpay&apos;s 256-bit encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
