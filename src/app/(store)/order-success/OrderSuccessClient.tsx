"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Package, ArrowRight, ShoppingBag } from "lucide-react";

export default function OrderSuccessClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
      <div className="animate-slide-up">
        <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={40} className="text-gray-700" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Order Confirmed!
        </h1>
        <p className="text-muted mt-2">
          Thank you for your purchase. Your order has been placed successfully.
        </p>

        {orderNumber && (
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <Package size={18} className="text-primary" />
            <span className="text-sm text-muted">Order Number:</span>
            <span className="text-sm font-bold text-foreground">{orderNumber}</span>
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl border border-border p-6 text-left">
          <h3 className="font-semibold text-foreground mb-3">What happens next?</h3>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <div className="w-6 h-6 shrink-0 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
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
              <div className="w-6 h-6 shrink-0 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
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
              <div className="w-6 h-6 shrink-0 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
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

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {orderId && (
            <Link
              href={`/account/orders/${orderId}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors"
            >
              <Package size={18} />
              View Order
            </Link>
          )}
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-border text-foreground font-medium rounded-full hover:bg-gray-50 transition-colors"
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
