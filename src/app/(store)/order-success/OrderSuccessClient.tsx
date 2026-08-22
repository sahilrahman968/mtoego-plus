"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight, ShoppingBag } from "lucide-react";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center overflow-hidden px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <div aria-hidden="true" className="absolute inset-x-8 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="relative w-full max-w-2xl animate-slide-up border border-border bg-card px-6 py-12 shadow-[0_28px_80px_rgba(61,45,24,0.1)] sm:px-12 sm:py-16">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10">
          <CheckCircle size={32} strokeWidth={1.5} className="text-primary" aria-hidden="true" />
        </div>

        <p className="eyebrow mb-3 text-primary">Thank you</p>
        <h1 className="section-title text-4xl text-foreground sm:text-5xl">
          Order Confirmed
        </h1>
        <p className="body-copy mx-auto mt-3 text-muted">
          Your order has been received. You can view its latest details and status from your account.
        </p>

        {orderNumber && (
          <div className="mt-7 inline-flex items-center gap-2 border-y border-border px-4 py-3">
            <Package size={18} className="text-primary" aria-hidden="true" />
            <span className="meta-text text-muted">Order Number:</span>
            <span className="tabular text-sm font-bold text-foreground">{orderNumber}</span>
          </div>
        )}

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {orderId && (
            <Link
              href={`/account/orders/${orderId}`}
              className="btn-text inline-flex min-h-12 min-w-[190px] items-center justify-center gap-2 bg-foreground px-6 py-3.5 text-background transition-colors hover:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Package size={18} aria-hidden="true" />
              View Order
            </Link>
          )}
          <Link
            href="/products"
            className="btn-text inline-flex min-h-12 min-w-[190px] items-center justify-center gap-2 border border-foreground bg-transparent px-6 py-3.5 text-foreground transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ShoppingBag size={18} aria-hidden="true" />
            Continue Shopping
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
