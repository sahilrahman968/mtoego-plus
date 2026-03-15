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
  pending: "bg-gray-100 text-gray-800",
  paid: "bg-gray-100 text-gray-800",
  processing: "bg-gray-100 text-gray-800",
  shipped: "bg-gray-100 text-gray-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-gray-100 text-gray-800",
  refunded: "bg-gray-100 text-gray-800",
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Login Required</h1>
        <Link
          href={`/login?redirect=/account/orders/${orderId}`}
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded w-64 animate-pulse-slow" />
          <div className="h-32 bg-gray-100 rounded-xl animate-pulse-slow" />
          <div className="h-48 bg-gray-100 rounded-xl animate-pulse-slow" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Order Not Found</h1>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 mt-6 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>
    );
  }

  const StatusIcon = STATUS_ICONS[order.status] || Package;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
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
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full capitalize ${
            STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"
          }`}
        >
          <StatusIcon size={14} />
          {order.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Order Timeline</h3>
            <div className="space-y-4">
              {order.statusHistory.map((entry, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="relative">
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        idx === order.statusHistory.length - 1
                          ? "bg-primary"
                          : "bg-gray-300"
                      }`}
                    />
                    {idx < order.statusHistory.length - 1 && (
                      <div className="absolute left-1.5 top-4 w-px h-6 -translate-x-1/2 bg-gray-200" />
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
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">
              Items ({order.items.length})
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item._id} className="flex gap-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-50 shrink-0">
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
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={18} className="text-primary" />
              <h3 className="font-semibold text-foreground">Shipping Address</h3>
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
          <div className="sticky top-28 bg-white rounded-xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Payment Details</h3>
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
              <div className="mt-4 pt-4 border-t border-border">
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
