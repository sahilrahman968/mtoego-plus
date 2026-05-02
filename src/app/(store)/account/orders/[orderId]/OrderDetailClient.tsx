"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrder, type OrderDetail } from "@/lib/store-api";
import { formatPrice, getProductImage } from "@/lib/utils";
import { OrderDetailPageSkeleton } from "@/components/store/skeletons";

const STATUS_ICONS: Record<string, typeof Package> = {
  pending: Clock,
  paid: CreditCard,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: AlertCircle,
  refunded: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "border border-[#4A3B17] bg-[#251D0D] text-[#D4A64C]",
  paid: "border border-primary/45 bg-primary/15 text-primary",
  processing: "border border-[#3A2F52] bg-[#1B1627] text-[#A68CFF]",
  shipped: "border border-[#264352] bg-[#111E26] text-[#6FBEE9]",
  delivered: "border border-[#1E4C33] bg-[#10241A] text-[#6DD79C]",
  cancelled: "border border-[#5A232F] bg-[#2A1218] text-[#F08095]",
  refunded: "border border-[#4F355E] bg-[#24172C] text-[#D09EFF]",
};

export default function OrderDetailClient({ orderId }: { orderId: string }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    getOrder(orderId).then((res) => {
      if (res.success && res.data) setOrder(res.data);
      setLoading(false);
    });
  }, [orderId, isAuthenticated]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <Package size={48} className="mx-auto mb-4 text-muted/40" />
        <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-foreground">Login Required</h1>
        <Link
          href={`/login?redirect=/account/orders/${orderId}`}
          className="mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-8 sm:px-4 lg:px-6">
        <OrderDetailPageSkeleton />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <AlertCircle size={48} className="mx-auto mb-4 text-muted/40" />
        <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-foreground">Order Not Found</h1>
        <Link
          href="/account/orders"
          className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status] || Package;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      {/* Back */}
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-[0.05em] text-foreground sm:text-4xl">
            {order.orderNumber}
          </h1>
          <p className="text-sm text-muted mt-1">
            Placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize ${
            STATUS_COLORS[order.status] || "border border-border bg-card text-muted"
          }`}
        >
          <StatusIcon size={14} />
          {order.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="border border-border bg-card/75 p-6">
            <h3 className="mb-4 font-semibold uppercase tracking-[0.08em] text-foreground">Order Timeline</h3>
            <div className="space-y-4">
              {order.statusHistory.map((entry, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="relative">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        idx === order.statusHistory.length - 1
                          ? "bg-primary"
                          : "bg-muted/45"
                      }`}
                    />
                    {idx < order.statusHistory.length - 1 && (
                      <div className="absolute left-1.5 top-4 h-6 w-px -translate-x-1/2 bg-border" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">
                      {entry.status}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-muted">{entry.note}</p>
                    )}
                    <p className="text-xs text-muted">
                      {new Date(entry.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="border border-border bg-card/75 p-6">
            <h3 className="mb-4 font-semibold uppercase tracking-[0.08em] text-foreground">
              Items ({order.items.length})
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item._id} className="flex gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-border bg-black/45">
                    <Image
                      src={getProductImage(item.product?.images)}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {item.product?.slug ? (
                      <Link
                        href={`/products/${item.product.slug}`}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      {item.variantLabel} • SKU: {item.sku}
                    </p>
                    <p className="text-xs text-muted">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatPrice(item.total)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border border-border bg-card/75 p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-primary" />
              <h3 className="font-semibold uppercase tracking-[0.08em] text-foreground">Shipping Address</h3>
            </div>
            <div className="text-sm text-foreground">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p className="text-muted">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
              </p>
              <p className="text-muted">
                {order.shippingAddress.city}, {order.shippingAddress.state} -{" "}
                {order.shippingAddress.pincode}
              </p>
              <p className="text-muted">Phone: {order.shippingAddress.phone}</p>
            </div>
          </div>
        </div>

        {/* Pricing Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 border border-border bg-card/85 p-6">
            <h3 className="mb-4 font-semibold uppercase tracking-[0.08em] text-foreground">Payment Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{formatPrice(order.pricing.subtotal)}</span>
              </div>
              {order.pricing.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>
                    Discount
                    {order.coupon ? ` (${order.coupon.code})` : ""}
                  </span>
                  <span>-{formatPrice(order.pricing.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">GST</span>
                <span>{formatPrice(order.pricing.totalTax)}</span>
              </div>
              {order.pricing.cgst > 0 && (
                <div className="flex justify-between text-xs text-muted pl-2">
                  <span>CGST</span>
                  <span>{formatPrice(order.pricing.cgst)}</span>
                </div>
              )}
              {order.pricing.sgst > 0 && (
                <div className="flex justify-between text-xs text-muted pl-2">
                  <span>SGST</span>
                  <span>{formatPrice(order.pricing.sgst)}</span>
                </div>
              )}
              {order.pricing.igst > 0 && (
                <div className="flex justify-between text-xs text-muted pl-2">
                  <span>IGST</span>
                  <span>{formatPrice(order.pricing.igst)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span>
                  {order.pricing.shippingCost === 0
                    ? "Free"
                    : formatPrice(order.pricing.shippingCost)}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(order.pricing.grandTotal)}</span>
              </div>
            </div>

            {/* Payment info */}
            {order.payment.razorpayPaymentId && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} className="text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Payment Info
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Payment ID: {order.payment.razorpayPaymentId}
                </p>
                {order.payment.paidAt && (
                  <p className="text-xs text-muted">
                    Paid on:{" "}
                    {new Date(order.payment.paidAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
