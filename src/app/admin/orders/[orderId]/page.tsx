"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import LoadingSpinner from "../../components/LoadingSpinner";
import { getProductImage } from "@/lib/utils";

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

interface OrderDetail {
  _id: string;
  orderNumber: string;
  user?: { _id: string; name: string; email: string };
  items: {
    title: string;
    variantLabel: string;
    sku: string;
    price: number;
    gst?: number;
    quantity: number;
    total: number;
    product?: {
      slug?: string;
      images?: { url: string; alt?: string }[];
    } | null;
  }[];
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  pricing: {
    subtotal: number;
    discount: number;
    subtotalAfterDiscount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    shippingCost: number;
    grandTotal: number;
  };
  payment: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    method?: string;
    amountPaid: number;
    currency: string;
    paidAt?: string;
  };
  coupon?: {
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  };
  status: string;
  statusHistory: StatusHistoryEntry[];
  trackingNumber?: string;
  trackingUrl?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "cancelled", "refunded"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/orders/${orderId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setOrder(json.data);
          setTrackingNumber(json.data.trackingNumber || "");
          setTrackingUrl(json.data.trackingUrl || "");
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const copyTrackingNumber = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTracking(value);
      setTimeout(() => setCopiedTracking(null), 2000);
    } catch {
      setError("Failed to copy tracking number");
    }
  };

  const saveTracking = async () => {
    setUpdating(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: trackingNumber.trim(),
          trackingUrl: trackingUrl.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      } else {
        setError(json.message || "Failed to update tracking details");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    setError("");

    if (newStatus === "shipped") {
      if (trackingNumber.trim().length < 3) {
        setError("AWB / tracking number is required (min 3 characters)");
        setUpdating(false);
        return;
      }
      if (!trackingUrl.trim()) {
        setError("Tracking URL is required");
        setUpdating(false);
        return;
      }
      try {
        const parsed = new URL(trackingUrl.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          setError("Tracking URL must use http or https");
          setUpdating(false);
          return;
        }
      } catch {
        setError("Tracking URL must be a valid URL");
        setUpdating(false);
        return;
      }
    }

    const body: Record<string, string> = { status: newStatus };
    if (statusNote) body.note = statusNote;
    if (newStatus === "cancelled" && cancelReason) body.cancelReason = cancelReason;
    if (newStatus === "shipped") {
      body.trackingNumber = trackingNumber.trim();
      body.trackingUrl = trackingUrl.trim();
    }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setStatusNote("");
        setCancelReason("");
        setTrackingNumber(json.data.trackingNumber || "");
        setTrackingUrl(json.data.trackingUrl || "");
      } else {
        setError(json.message || "Failed to update status");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Order not found</p>
        <button onClick={() => router.push("/admin/orders")} className="mt-4 text-gray-900 hover:underline text-sm">
          Back to orders
        </button>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];

  return (
    <div>
      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`}
      />

      {error && (
        <div className="mb-4 p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {order.items.map((item, i) => {
                const gst = typeof item.gst === "number" ? item.gst : 18;
                const unitIncl = Math.round(item.price * (1 + gst / 100) * 100) / 100;
                const lineIncl = Math.round(unitIncl * item.quantity * 100) / 100;
                return (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                      <Image
                        src={getProductImage(item.product?.images)}
                        alt={item.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.variantLabel && <span>{item.variantLabel} · </span>}
                        SKU: {item.sku} · Qty: {item.quantity} · GST: {gst}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-slate-900">₹{lineIncl.toLocaleString("en-IN")}</p>
                    <p className="text-xs text-slate-400">
                      ₹{unitIncl.toLocaleString("en-IN")} each (incl. GST)
                    </p>
                    <p className="text-xs text-slate-400">
                      Base ₹{item.price.toLocaleString("en-IN")} + GST
                    </p>
                  </div>
                </div>
                );
              })}
            </div>
            {/* Pricing summary */}
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal (excl. GST)</span>
                <span className="text-slate-700">₹{order.pricing.subtotal.toLocaleString("en-IN")}</span>
              </div>
              {order.pricing.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="text-gray-700">-₹{order.pricing.discount.toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.pricing.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Taxable amount</span>
                  <span className="text-slate-700">₹{order.pricing.subtotalAfterDiscount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">GST</span>
                <span className="text-slate-700">₹{order.pricing.totalTax.toLocaleString("en-IN")}</span>
              </div>
              {order.pricing.cgst > 0 && (
                <div className="flex justify-between text-xs text-slate-400 pl-2">
                  <span>CGST</span>
                  <span>₹{order.pricing.cgst.toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.pricing.sgst > 0 && (
                <div className="flex justify-between text-xs text-slate-400 pl-2">
                  <span>SGST</span>
                  <span>₹{order.pricing.sgst.toLocaleString("en-IN")}</span>
                </div>
              )}
              {order.pricing.igst > 0 && (
                <div className="flex justify-between text-xs text-slate-400 pl-2">
                  <span>IGST</span>
                  <span>₹{order.pricing.igst.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Shipping</span>
                <span className="text-slate-700">
                  {order.pricing.shippingCost === 0 ? "Free" : `₹${order.pricing.shippingCost.toLocaleString("en-IN")}`}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-slate-200">
                <span className="text-slate-900">Grand Total (incl. GST)</span>
                <span className="text-slate-900">₹{order.pricing.grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Status History</h3>
            <div className="space-y-3">
              {order.statusHistory.map((entry, i) => {
                const awb =
                  entry.trackingNumber ||
                  (entry.status === "shipped" ? order.trackingNumber : undefined);
                const trackUrl =
                  entry.trackingUrl ||
                  (entry.status === "shipped" ? order.trackingUrl : undefined);

                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={entry.status} />
                        <span className="text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {entry.note && <p className="text-xs text-slate-500 mt-0.5">{entry.note}</p>}
                      {entry.status === "shipped" && (awb || trackUrl) && (
                        <div className="mt-2 space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          {awb && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 shrink-0">AWB / Tracking</span>
                              <code className="text-xs font-medium text-slate-800 truncate">
                                {awb}
                              </code>
                              <button
                                type="button"
                                onClick={() => copyTrackingNumber(awb)}
                                className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                                title="Copy tracking number"
                              >
                                {copiedTracking === awb ? (
                                  <Check size={12} className="text-green-600" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          )}
                          {trackUrl && (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-slate-500 shrink-0">Track</span>
                              <a
                                href={trackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-gray-900 hover:underline truncate min-w-0"
                              >
                                <span className="truncate">{trackUrl}</span>
                                <ExternalLink size={11} className="shrink-0" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status + Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Order Status</h3>
            <div className="mb-4">
              <StatusBadge status={order.status} className="text-sm" />
            </div>

            {allowedTransitions.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Add a note..."
                  />
                </div>
                {allowedTransitions.includes("shipped") && (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-slate-700">
                      Shipping details required to mark as shipped
                    </p>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        AWB / Tracking number
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="e.g. BLUEDART123456"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tracking URL</label>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                )}
                {allowedTransitions.includes("cancelled") && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Cancel reason</label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                      placeholder="Reason for cancellation..."
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      disabled={updating}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors capitalize ${
                        s === "cancelled" || s === "refunded"
                          ? "text-gray-600 border border-gray-200 hover:bg-gray-50"
                          : "text-white bg-gray-900 hover:bg-black"
                      }`}
                    >
                      {s === "cancelled" ? "Cancel" : s === "refunded" ? "Refund" : `Mark ${s}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {order.cancelReason && (
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700">Cancel Reason</p>
                <p className="text-xs text-gray-600">{order.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Tracking (shipped / delivered orders) */}
          {(order.status === "shipped" || order.status === "delivered") && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Tracking</h3>

              {order.trackingNumber ? (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-medium text-slate-800 truncate">
                      {order.trackingNumber}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyTrackingNumber(order.trackingNumber!)}
                      className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Copy tracking number"
                    >
                      {copiedTracking === order.trackingNumber ? (
                        <Check size={13} className="text-green-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-900 hover:underline"
                    >
                      Open tracking page
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ) : (
                <p className="mb-3 text-xs text-gray-600">
                  No tracking details saved for this order yet.
                </p>
              )}

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    AWB / Tracking number
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="e.g. BLUEDART123456"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tracking URL</label>
                  <input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="button"
                  onClick={saveTracking}
                  disabled={updating}
                  className="w-full px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                >
                  {order.trackingNumber ? "Update tracking" : "Save tracking"}
                </button>
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Customer</h3>
            <p className="text-sm text-slate-700">{order.user?.name || "N/A"}</p>
            <p className="text-xs text-slate-400">{order.user?.email || ""}</p>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Shipping Address</h3>
            <div className="text-sm text-slate-600 space-y-0.5">
              <p className="font-medium text-slate-700">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
              </p>
              <p className="text-slate-400">{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Payment</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="text-slate-700 capitalize">{order.payment.method || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="text-slate-700">
                  {order.payment.currency} {(order.payment.amountPaid / 100).toLocaleString("en-IN")}
                </span>
              </div>
              {order.payment.paidAt && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid at</span>
                  <span className="text-slate-700 text-xs">
                    {new Date(order.payment.paidAt).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div className="pt-1.5 mt-1.5 border-t border-slate-100">
                <p className="text-xs text-slate-400 break-all">ID: {order.payment.razorpayPaymentId || "—"}</p>
              </div>
            </div>
          </div>

          {/* Coupon */}
          {order.coupon && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Coupon Applied</h3>
              <div className="space-y-1 text-sm">
                <code className="text-sm font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded">
                  {order.coupon.code}
                </code>
                <p className="text-slate-500">
                  {order.coupon.type === "percentage" ? `${order.coupon.value}%` : `₹${order.coupon.value}`} off
                </p>
                <p className="text-gray-700 font-medium">
                  -₹{order.coupon.discountAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          )}

          {order.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Notes</h3>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
