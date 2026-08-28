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
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrder, type OrderDetail } from "@/lib/store-api";
import { formatPrice, getProductImage, isProductUnavailable } from "@/lib/utils";
import { formatAddressLines } from "@/lib/addresses/format-address";
import { priceInclGst } from "@/lib/pricing";
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
  const [copiedTracking, setCopiedTracking] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    getOrder(orderId).then((res) => {
      if (res.success && res.data) setOrder(res.data);
      setLoading(false);
    });
  }, [orderId, isAuthenticated]);

  const copyTrackingNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    } catch {
      // Clipboard may be unavailable; ignore silently
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <Package size={48} className="mx-auto mb-4 text-muted/40" />
        <h1 className="text-3xl text-foreground">Login Required</h1>
        <Link
          href={`/login?redirect=/account/orders/${orderId}`}
          className="btn-text mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
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
        <h1 className="text-3xl text-foreground">Order Not Found</h1>
        <Link
          href="/account/orders"
          className="btn-text mt-6 inline-flex items-center gap-2 text-primary hover:underline"
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
        className="btn-text mb-7 inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="tabular section-title text-3xl text-foreground sm:text-4xl">
            {order.orderNumber}
          </h1>
          <p className="meta-text mt-2 text-muted">
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
          className={`eyebrow-xs inline-flex items-center gap-1.5 px-3 py-1.5 capitalize ${
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
            <h3 className="section-title mb-5 text-base text-foreground">Order Timeline</h3>
            <div className="space-y-4">
              {order.statusHistory.map((entry, idx) => {
                const awb =
                  entry.trackingNumber ||
                  (entry.status === "shipped" ? order.trackingNumber : undefined);
                const trackUrl =
                  entry.trackingUrl ||
                  (entry.status === "shipped" ? order.trackingUrl : undefined);

                return (
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize leading-snug text-foreground">
                        {entry.status}
                      </p>
                      {entry.note && (
                        <p className="meta-text mt-0.5 text-muted">{entry.note}</p>
                      )}
                      {entry.status === "shipped" && (awb || trackUrl) && (
                        <div className="mt-2 space-y-1.5 border border-border bg-black/25 px-3 py-2">
                          {awb && (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="eyebrow-xs shrink-0 text-muted">
                                AWB
                              </span>
                              <code className="tabular truncate text-xs text-foreground">{awb}</code>
                              <button
                                type="button"
                                onClick={() => copyTrackingNumber(awb)}
                                className="shrink-0 p-1 text-muted transition-colors hover:text-foreground"
                                title="Copy tracking number"
                                aria-label="Copy tracking number"
                              >
                                {copiedTracking ? (
                                  <Check size={12} className="text-success" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          )}
                          {trackUrl && (
                            <a
                              href={trackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="meta-text inline-flex min-w-0 items-center gap-1.5 text-primary hover:underline"
                            >
                              <ExternalLink size={12} className="shrink-0" />
                              <span className="truncate">Track shipment</span>
                            </a>
                          )}
                        </div>
                      )}
                      <p className="meta-text tabular mt-1 text-muted">
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
                );
              })}
            </div>
          </div>

          {/* Items */}
          <div className="border border-border bg-card/75 p-6">
            <h3 className="section-title mb-5 text-base text-foreground">
              Items ({order.items.length})
            </h3>
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const unavailable = isProductUnavailable(item.product);
                const canLink = !unavailable && !!item.product?.slug;

                return (
                <div key={`${item.sku}-${index}`} className="flex gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-border bg-black/45">
                    <Image
                      src={getProductImage(item.product?.images)}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className={`object-cover ${unavailable ? "grayscale" : ""}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {canLink ? (
                      <Link
                        href={`/products/${item.product!.slug}`}
                        className="text-sm font-medium leading-snug text-foreground transition-colors hover:text-primary"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium leading-snug text-foreground">
                        {item.title}
                      </p>
                    )}
                    {unavailable && (
                      <p className="eyebrow-xs mt-0.5 text-danger">
                        Product unavailable
                      </p>
                    )}
                    <p className="meta-text tabular mt-1 text-muted">
                      {item.variantLabel} • SKU: {item.sku}
                    </p>
                    <p className="meta-text tabular text-muted">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="price text-sm font-medium text-foreground">
                      {formatPrice(priceInclGst(item.price, item.gst) * item.quantity)}
                    </p>
                    <p className="meta-text tabular mt-0.5 text-muted">
                      {formatPrice(priceInclGst(item.price, item.gst))} each (incl. GST)
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border border-border bg-card/75 p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-primary" />
              <h3 className="section-title text-base text-foreground">Shipping Address</h3>
            </div>
            <div className="text-sm leading-relaxed text-foreground">
              {formatAddressLines(order.shippingAddress, { includeCountry: true }).map(
                (line) => (
                  <p
                    key={line}
                    className={
                      line.startsWith("Phone:")
                        ? "tabular text-muted"
                        : line === order.shippingAddress.name
                          ? "font-medium"
                          : "text-muted"
                    }
                  >
                    {line}
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Pricing Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 border border-border bg-card/85 p-6">
            <h3 className="section-title mb-5 text-base text-foreground">Payment Details</h3>
            <div className="tabular space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal (excl. GST)</span>
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
              {order.pricing.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Taxable amount</span>
                  <span>{formatPrice(order.pricing.subtotalAfterDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">GST</span>
                <span>{formatPrice(order.pricing.totalTax)}</span>
              </div>
              {order.pricing.cgst > 0 && (
                <div className="flex justify-between pl-3 text-xs text-muted">
                  <span>CGST</span>
                  <span>{formatPrice(order.pricing.cgst)}</span>
                </div>
              )}
              {order.pricing.sgst > 0 && (
                <div className="flex justify-between pl-3 text-xs text-muted">
                  <span>SGST</span>
                  <span>{formatPrice(order.pricing.sgst)}</span>
                </div>
              )}
              {order.pricing.igst > 0 && (
                <div className="flex justify-between pl-3 text-xs text-muted">
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
                <span>Total (incl. GST)</span>
                <span>{formatPrice(order.pricing.grandTotal)}</span>
              </div>
            </div>

            {/* Payment info */}
            {order.payment.razorpayPaymentId && (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard size={16} className="text-primary" />
                  <span className="label-text text-foreground">
                    Payment Info
                  </span>
                </div>
                <p className="meta-text tabular break-all text-muted">
                  Payment ID: {order.payment.razorpayPaymentId}
                </p>
                {order.payment.paidAt && (
                  <p className="meta-text tabular mt-1 text-muted">
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
