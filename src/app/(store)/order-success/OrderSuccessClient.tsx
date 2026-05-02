"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight, ShoppingBag } from "lucide-react";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <div className="animate-slide-up">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/35 bg-primary/12">
          <CheckCircle size={40} className="text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Order Confirmed!
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted sm:text-base">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {orderNumber && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
            <Package size={18} className="text-primary" />
            <span className="text-sm text-muted">Order Number:</span>
            <span className="text-sm font-bold text-foreground">{orderNumber}</span>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border bg-card p-6 text-left sm:p-7">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            What Happens Next?
          </h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                1
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Order Processing
                </p>
                <p className="text-xs text-muted">
                  We&apos;re preparing your order for shipment
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-xs font-bold text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Shipped</p>
                <p className="text-xs text-muted">
                  You&apos;ll receive tracking details via email
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/15 text-xs font-bold text-primary">
                3
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Delivered</p>
                <p className="text-xs text-muted">
                  Expected within 5-7 business days
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {orderId && (
            <Link
              href={`/account/orders/${orderId}`}
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
            >
              <Package size={18} />
              View Order
            </Link>
          )}
          <Link
            href="/products"
            className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-medium text-foreground transition-colors hover:bg-card-hover"
          >
            <ShoppingBag size={18} />
            Continue Shopping
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
