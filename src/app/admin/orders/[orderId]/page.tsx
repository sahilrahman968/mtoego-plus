"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { AdminErrorState, AdminFormSkeleton } from "../../components/FeedbackState";
import { Button, ButtonLink } from "../../components/Button";
import { Surface, Section } from "../../components/Surface";
import { TextField } from "../../components/Fields";
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

const RISKY_STATUSES = new Set(["cancelled", "refunded"]);

type Tone = "success" | "warning" | "danger" | "info" | "inert";

const toneClass: Record<Tone, string> = {
  success: "bg-admin-success-soft text-admin-success ring-admin-success-line",
  warning: "bg-admin-warning-soft text-admin-warning ring-admin-warning-line",
  danger: "bg-admin-danger-soft text-admin-danger ring-admin-danger-line",
  info: "bg-admin-info-soft text-admin-info ring-admin-info-line",
  inert: "bg-admin-subtle text-admin-faint ring-admin-line",
};

function Chip({ tone, children }: { tone: Tone; children: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseUser(value: unknown): OrderDetail["user"] {
  if (!isRecord(value)) return undefined;
  const id = asString(value._id);
  if (!id) return undefined;
  return {
    _id: id,
    name: asString(value.name, "N/A"),
    email: asString(value.email),
  };
}

function parseOrder(raw: unknown): OrderDetail | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw._id);
  const orderNumber = asString(raw.orderNumber);
  if (!id || !orderNumber) return null;

  const pricing = isRecord(raw.pricing) ? raw.pricing : {};
  const payment = isRecord(raw.payment) ? raw.payment : {};
  const address = isRecord(raw.shippingAddress) ? raw.shippingAddress : {};
  const coupon = isRecord(raw.coupon) ? raw.coupon : null;

  const items = Array.isArray(raw.items)
    ? raw.items.map((item) => {
        const row = isRecord(item) ? item : {};
        const product = isRecord(row.product) ? row.product : null;
        const images = product && Array.isArray(product.images)
          ? product.images
              .filter(isRecord)
              .map((image) => ({
                url: asString(image.url),
                alt: asString(image.alt) || undefined,
              }))
              .filter((image) => image.url)
          : undefined;
        return {
          title: asString(row.title, "Item"),
          variantLabel: asString(row.variantLabel),
          sku: asString(row.sku),
          price: asNumber(row.price),
          gst: typeof row.gst === "number" ? row.gst : undefined,
          quantity: asNumber(row.quantity, 1),
          total: asNumber(row.total),
          product: product
            ? { slug: asString(product.slug) || undefined, images }
            : null,
        };
      })
    : [];

  const statusHistory = Array.isArray(raw.statusHistory)
    ? raw.statusHistory.map((entry) => {
        const row = isRecord(entry) ? entry : {};
        return {
          status: asString(row.status),
          timestamp: asString(row.timestamp),
          note: asString(row.note) || undefined,
          trackingNumber: asString(row.trackingNumber) || undefined,
          trackingUrl: asString(row.trackingUrl) || undefined,
        };
      })
    : [];

  return {
    _id: id,
    orderNumber,
    user: parseUser(raw.user),
    items,
    shippingAddress: {
      name: asString(address.name),
      phone: asString(address.phone),
      line1: asString(address.line1),
      line2: asString(address.line2) || undefined,
      city: asString(address.city),
      state: asString(address.state),
      pincode: asString(address.pincode),
      country: asString(address.country),
    },
    pricing: {
      subtotal: asNumber(pricing.subtotal),
      discount: asNumber(pricing.discount),
      subtotalAfterDiscount: asNumber(pricing.subtotalAfterDiscount),
      cgst: asNumber(pricing.cgst),
      sgst: asNumber(pricing.sgst),
      igst: asNumber(pricing.igst),
      totalTax: asNumber(pricing.totalTax),
      shippingCost: asNumber(pricing.shippingCost),
      grandTotal: asNumber(pricing.grandTotal),
    },
    payment: {
      razorpayOrderId: asString(payment.razorpayOrderId),
      razorpayPaymentId: asString(payment.razorpayPaymentId) || undefined,
      method: asString(payment.method) || undefined,
      amountPaid: asNumber(payment.amountPaid),
      currency: asString(payment.currency, "INR"),
      paidAt: asString(payment.paidAt) || undefined,
    },
    coupon: coupon
      ? {
          code: asString(coupon.code),
          type: asString(coupon.type),
          value: asNumber(coupon.value),
          discountAmount: asNumber(coupon.discountAmount),
        }
      : undefined,
    status: asString(raw.status, "pending"),
    statusHistory,
    trackingNumber: asString(raw.trackingNumber) || undefined,
    trackingUrl: asString(raw.trackingUrl) || undefined,
    notes: asString(raw.notes) || undefined,
    cancelReason: asString(raw.cancelReason) || undefined,
    createdAt: asString(raw.createdAt),
  };
}

function paymentChip(order: OrderDetail): { tone: Tone; label: string } {
  if (order.status === "refunded") return { tone: "danger", label: "Refunded" };
  const captured =
    Boolean(order.payment.paidAt) ||
    Boolean(order.payment.razorpayPaymentId) ||
    ["paid", "processing", "shipped", "delivered"].includes(order.status);
  if (captured) return { tone: "success", label: "Paid" };
  return { tone: "warning", label: "Unpaid" };
}

function fulfillmentChip(order: OrderDetail): { tone: Tone; label: string } {
  switch (order.status) {
    case "processing":
      return { tone: "info", label: "Preparing" };
    case "shipped":
      return { tone: "info", label: "In transit" };
    case "delivered":
      return { tone: "success", label: "Delivered" };
    case "cancelled":
    case "refunded":
      return { tone: "inert", label: "Not fulfilled" };
    default:
      return { tone: "inert", label: "Unfulfilled" };
  }
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function validateTracking(trackingNumber: string, trackingUrl: string): string | null {
  if (trackingNumber.trim().length < 3) {
    return "AWB / tracking number is required (min 3 characters)";
  }
  if (!trackingUrl.trim()) {
    return "Tracking URL is required";
  }
  try {
    const parsed = new URL(trackingUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Tracking URL must use http or https";
    }
  } catch {
    return "Tracking URL must be a valid URL";
  }
  return null;
}

function statusLabel(status: string) {
  if (status === "cancelled") return "Cancel";
  if (status === "refunded") return "Refund";
  return `Mark ${status}`;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const loadOrder = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    fetch(`/api/admin/orders/${orderId}`)
      .then((response) => response.json())
      .then((json) => {
        const parsed = json.success ? parseOrder(json.data) : null;
        if (parsed) {
          setOrder(parsed);
          setTrackingNumber(parsed.trackingNumber || "");
          setTrackingUrl(parsed.trackingUrl || "");
        } else {
          setOrder(null);
          setLoadError(Boolean(json.success) || json.message !== "Order not found");
        }
      })
      .catch((err) => {
        console.error(err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const copyValue = async (value: string, key: string, failureMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setError(failureMessage);
    }
  };

  const applyOrder = (next: OrderDetail) => {
    setOrder(next);
    setTrackingNumber(next.trackingNumber || "");
    setTrackingUrl(next.trackingUrl || "");
  };

  const saveTracking = async () => {
    const trackingError = validateTracking(trackingNumber, trackingUrl);
    if (trackingError) {
      setError(trackingError);
      return;
    }

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
      const parsed = json.success ? parseOrder(json.data) : null;
      if (parsed) {
        applyOrder(parsed);
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
      const trackingError = validateTracking(trackingNumber, trackingUrl);
      if (trackingError) {
        setError(trackingError);
        setUpdating(false);
        document.getElementById("order-status-actions")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
    }

    if (newStatus === "cancelled" && cancelReason.trim().length < 3) {
      setError("Cancel reason is required (min 3 characters)");
      setUpdating(false);
      document.getElementById("order-status-actions")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
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
      const parsed = json.success ? parseOrder(json.data) : null;
      if (parsed) {
        applyOrder(parsed);
        setStatusNote("");
        setCancelReason("");
        setPendingStatus(null);
      } else {
        setError(json.message || "Failed to update status");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setUpdating(false);
    }
  };

  const requestStatusChange = (newStatus: string) => {
    if (RISKY_STATUSES.has(newStatus)) {
      if (newStatus === "cancelled" && cancelReason.trim().length < 3) {
        setError("Cancel reason is required (min 3 characters)");
        document.getElementById("order-status-actions")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      setPendingStatus(newStatus);
      return;
    }
    void updateStatus(newStatus);
  };

  if (loading) return <AdminFormSkeleton sections={3} />;

  if (loadError) {
    return (
      <AdminErrorState
        title="Unable to load order"
        message="This order could not be fetched. Check your connection and try again."
        onRetry={loadOrder}
      />
    );
  }

  if (!order) {
    return (
      <div className="py-16 text-center">
        <p className="text-admin-muted">Order not found</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/admin/orders")}
        >
          Back to orders
        </Button>
      </div>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
  const payment = paymentChip(order);
  const fulfillment = fulfillmentChip(order);
  const placedOn = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown date";

  const renderStatusButtons = () => (
    <>
      {allowedTransitions.map((status) => (
        <Button
          key={status}
          onClick={() => requestStatusChange(status)}
          disabled={updating}
          size="sm"
          variant={RISKY_STATUSES.has(status) ? "secondary" : "primary"}
          aria-label={`${statusLabel(status)} order ${order.orderNumber}`}
          className="capitalize"
        >
          {statusLabel(status)}
        </Button>
      ))}
    </>
  );

  return (
    <div className="pb-28 lg:pb-0">
      <ButtonLink
        href="/admin/orders"
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 w-fit px-2"
        aria-label="Back to orders"
        icon={<ArrowLeft aria-hidden="true" className="size-4" />}
      >
        Orders
      </ButtonLink>

      <PageHeader
        title={`Order ${order.orderNumber}`}
        description={`Placed on ${placedOn}`}
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-admin-line bg-admin-subtle p-3 text-sm text-admin-body"
        >
          {error}
        </div>
      )}

      <Surface className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-admin-muted">
              Summary
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-admin-heading">
              {money(order.pricing.grandTotal)}
            </p>
            <p className="mt-0.5 text-sm text-admin-muted">
              {order.items.reduce((sum, item) => sum + item.quantity, 0)} item
              {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"}
              {" · "}
              {order.user?.name || "N/A"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={order.status} />
            <Chip tone={payment.tone}>{`Payment: ${payment.label}`}</Chip>
            <Chip tone={fulfillment.tone}>{`Fulfillment: ${fulfillment.label}`}</Chip>
          </div>
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Section title="Items">
            <Surface padded={false} className="overflow-hidden">
              <ul className="divide-y divide-admin-line">
                {order.items.map((item, index) => {
                  const gst = typeof item.gst === "number" ? item.gst : 18;
                  const unitIncl = Math.round(item.price * (1 + gst / 100) * 100) / 100;
                  const lineIncl = Math.round(unitIncl * item.quantity * 100) / 100;
                  return (
                    <li key={`${item.sku}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-admin-line bg-admin-subtle">
                          <Image
                            src={getProductImage(item.product?.images)}
                            alt={item.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-admin-heading">{item.title}</p>
                          <p className="text-xs text-admin-muted">
                            {item.variantLabel && <span>{item.variantLabel} · </span>}
                            SKU: {item.sku} · Qty: {item.quantity} · GST: {gst}%
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium tabular text-admin-heading">{money(lineIncl)}</p>
                        <p className="text-xs text-admin-faint">
                          {money(unitIncl)} each (incl. GST)
                        </p>
                        <p className="text-xs text-admin-faint">
                          Base {money(item.price)} + GST
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="space-y-1.5 border-t border-admin-line bg-admin-subtle/50 px-4 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-admin-muted">Subtotal (excl. GST)</span>
                  <span className="tabular text-admin-body">{money(order.pricing.subtotal)}</span>
                </div>
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-muted">Discount</span>
                    <span className="tabular text-admin-body">-{money(order.pricing.discount)}</span>
                  </div>
                )}
                {order.pricing.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-admin-muted">Taxable amount</span>
                    <span className="tabular text-admin-body">
                      {money(order.pricing.subtotalAfterDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-admin-muted">GST</span>
                  <span className="tabular text-admin-body">{money(order.pricing.totalTax)}</span>
                </div>
                {order.pricing.cgst > 0 && (
                  <div className="flex justify-between pl-2 text-xs text-admin-faint">
                    <span>CGST</span>
                    <span className="tabular">{money(order.pricing.cgst)}</span>
                  </div>
                )}
                {order.pricing.sgst > 0 && (
                  <div className="flex justify-between pl-2 text-xs text-admin-faint">
                    <span>SGST</span>
                    <span className="tabular">{money(order.pricing.sgst)}</span>
                  </div>
                )}
                {order.pricing.igst > 0 && (
                  <div className="flex justify-between pl-2 text-xs text-admin-faint">
                    <span>IGST</span>
                    <span className="tabular">{money(order.pricing.igst)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-admin-muted">Shipping</span>
                  <span className="tabular text-admin-body">
                    {order.pricing.shippingCost === 0
                      ? "Free"
                      : money(order.pricing.shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-admin-line pt-1.5 text-sm font-semibold">
                  <span className="text-admin-heading">Grand Total (incl. GST)</span>
                  <span className="tabular text-admin-heading">{money(order.pricing.grandTotal)}</span>
                </div>
              </div>
            </Surface>
          </Section>

          <Section title="Timeline">
            <Surface>
              {order.statusHistory.length === 0 ? (
                <p className="text-sm text-admin-muted">No status history yet.</p>
              ) : (
                <ol className="space-y-3">
                  {order.statusHistory.map((entry, index) => {
                    const awb =
                      entry.trackingNumber ||
                      (entry.status === "shipped" ? order.trackingNumber : undefined);
                    const trackUrl =
                      entry.trackingUrl ||
                      (entry.status === "shipped" ? order.trackingUrl : undefined);
                    const copyKey = `history-${index}-${awb}`;

                    return (
                      <li key={`${entry.status}-${entry.timestamp}-${index}`} className="flex items-start gap-3">
                        <div className="mt-1.5 size-2.5 shrink-0 rounded-full bg-admin-primary" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={entry.status} />
                            <time
                              className="text-xs text-admin-faint"
                              dateTime={entry.timestamp}
                            >
                              {entry.timestamp
                                ? new Date(entry.timestamp).toLocaleString("en-IN")
                                : "—"}
                            </time>
                          </div>
                          {entry.note && (
                            <p className="mt-0.5 text-xs text-admin-muted">{entry.note}</p>
                          )}
                          {entry.status === "shipped" && (awb || trackUrl) && (
                            <div className="mt-2 space-y-1.5 rounded-lg border border-admin-line bg-admin-subtle px-3 py-2">
                              {awb && (
                                <div className="flex items-center gap-2">
                                  <span className="shrink-0 text-xs text-admin-muted">
                                    AWB / Tracking
                                  </span>
                                  <code className="truncate text-xs font-medium text-admin-body">
                                    {awb}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyValue(awb, copyKey, "Failed to copy tracking number")
                                    }
                                    className="shrink-0 rounded p-1 text-admin-faint transition-colors hover:bg-admin-hover hover:text-admin-body"
                                    aria-label={
                                      copiedKey === copyKey
                                        ? "Tracking number copied"
                                        : "Copy tracking number"
                                    }
                                  >
                                    {copiedKey === copyKey ? (
                                      <Check aria-hidden="true" size={12} className="text-admin-success" />
                                    ) : (
                                      <Copy aria-hidden="true" size={12} />
                                    )}
                                  </button>
                                </div>
                              )}
                              {trackUrl && (
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="shrink-0 text-xs text-admin-muted">Track</span>
                                  <a
                                    href={trackUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-w-0 items-center gap-1 truncate text-xs text-admin-heading hover:underline"
                                    aria-label="Open tracking page in a new tab"
                                  >
                                    <span className="truncate">{trackUrl}</span>
                                    <ExternalLink aria-hidden="true" size={11} className="shrink-0" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Surface>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Status">
            <Surface id="order-status-actions">
              <div className="mb-4 flex flex-wrap items-center gap-1.5">
                <StatusBadge status={order.status} className="text-sm" />
                <Chip tone={payment.tone}>{payment.label}</Chip>
                <Chip tone={fulfillment.tone}>{fulfillment.label}</Chip>
              </div>

              {allowedTransitions.length > 0 && (
                <div className="space-y-3">
                  <TextField
                    id="status-note"
                    label="Note (optional)"
                    type="text"
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                    placeholder="Add a note…"
                  />
                  {allowedTransitions.includes("shipped") && (
                    <div className="space-y-3 rounded-lg border border-admin-line bg-admin-subtle/80 p-3">
                      <p className="text-xs font-medium text-admin-body">
                        Shipping details required to mark as shipped
                      </p>
                      <TextField
                        id="ship-tracking-number"
                        label="AWB / Tracking number"
                        type="text"
                        value={trackingNumber}
                        onChange={(event) => setTrackingNumber(event.target.value)}
                        placeholder="e.g. BLUEDART123456"
                        required
                      />
                      <TextField
                        id="ship-tracking-url"
                        label="Tracking URL"
                        type="url"
                        value={trackingUrl}
                        onChange={(event) => setTrackingUrl(event.target.value)}
                        placeholder="https://…"
                        required
                      />
                    </div>
                  )}
                  {allowedTransitions.includes("cancelled") && (
                    <TextField
                      id="cancel-reason"
                      label="Cancel reason"
                      type="text"
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Reason for cancellation…"
                      required
                    />
                  )}
                  <div className="hidden flex-wrap gap-2 lg:flex">{renderStatusButtons()}</div>
                </div>
              )}

              {order.cancelReason && (
                <div className="mt-3 rounded-lg bg-admin-subtle p-2.5">
                  <p className="text-xs font-medium text-admin-body">Cancel reason</p>
                  <p className="text-xs text-admin-muted">{order.cancelReason}</p>
                </div>
              )}
            </Surface>
          </Section>

          {(order.status === "shipped" || order.status === "delivered") && (
            <Section title="Shipping / tracking">
              <Surface>
                {order.trackingNumber ? (
                  <div className="mb-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <code className="truncate text-sm font-medium text-admin-body">
                        {order.trackingNumber}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            order.trackingNumber!,
                            "saved-tracking",
                            "Failed to copy tracking number"
                          )
                        }
                        className="shrink-0 rounded p-1 text-admin-faint transition-colors hover:bg-admin-hover hover:text-admin-body"
                        aria-label={
                          copiedKey === "saved-tracking"
                            ? "Tracking number copied"
                            : "Copy tracking number"
                        }
                      >
                        {copiedKey === "saved-tracking" ? (
                          <Check aria-hidden="true" size={13} className="text-admin-success" />
                        ) : (
                          <Copy aria-hidden="true" size={13} />
                        )}
                      </button>
                    </div>
                    {order.trackingUrl && (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-admin-heading hover:underline"
                        aria-label="Open tracking page in a new tab"
                      >
                        Open tracking page
                        <ExternalLink aria-hidden="true" size={11} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-admin-muted">
                    No tracking details saved for this order yet.
                  </p>
                )}

                <div className="space-y-3 border-t border-admin-line pt-3">
                  <TextField
                    id="edit-tracking-number"
                    label="AWB / Tracking number"
                    type="text"
                    value={trackingNumber}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    placeholder="e.g. BLUEDART123456"
                  />
                  <TextField
                    id="edit-tracking-url"
                    label="Tracking URL"
                    type="url"
                    value={trackingUrl}
                    onChange={(event) => setTrackingUrl(event.target.value)}
                    placeholder="https://…"
                  />
                  <Button
                    type="button"
                    onClick={saveTracking}
                    disabled={updating}
                    className="w-full"
                    aria-label={
                      order.trackingNumber
                        ? "Update tracking details"
                        : "Save tracking details"
                    }
                  >
                    {order.trackingNumber ? "Update tracking" : "Save tracking"}
                  </Button>
                </div>
              </Surface>
            </Section>
          )}

          <Section title="Customer">
            <Surface>
              <p className="text-sm text-admin-body">{order.user?.name || "N/A"}</p>
              <p className="text-xs text-admin-faint">{order.user?.email || ""}</p>
              <div className="mt-4 border-t border-admin-line pt-3 text-sm text-admin-muted">
                <p className="text-xs font-medium uppercase tracking-wide text-admin-faint">
                  Shipping address
                </p>
                <p className="mt-1.5 font-medium text-admin-body">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.line1}</p>
                {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                  {order.shippingAddress.pincode}
                </p>
                <p className="text-admin-faint">{order.shippingAddress.phone}</p>
              </div>
            </Surface>
          </Section>

          <Section title="Payment">
            <Surface>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-admin-muted">Method</span>
                  <span className="capitalize text-admin-body">{order.payment.method || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-admin-muted">Amount</span>
                  <span className="tabular text-admin-body">
                    {order.payment.currency}{" "}
                    {(order.payment.amountPaid / 100).toLocaleString("en-IN")}
                  </span>
                </div>
                {order.payment.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-admin-muted">Paid at</span>
                    <span className="text-xs text-admin-body">
                      {new Date(order.payment.paidAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 flex items-start justify-between gap-2 border-t border-admin-line pt-1.5">
                  <p className="break-all text-xs text-admin-faint">
                    ID: {order.payment.razorpayPaymentId || "—"}
                  </p>
                  {order.payment.razorpayPaymentId && (
                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          order.payment.razorpayPaymentId!,
                          "payment-id",
                          "Failed to copy payment ID"
                        )
                      }
                      className="shrink-0 rounded p-1 text-admin-faint transition-colors hover:bg-admin-hover hover:text-admin-body"
                      aria-label={
                        copiedKey === "payment-id" ? "Payment ID copied" : "Copy payment ID"
                      }
                    >
                      {copiedKey === "payment-id" ? (
                        <Check aria-hidden="true" size={12} className="text-admin-success" />
                      ) : (
                        <Copy aria-hidden="true" size={12} />
                      )}
                    </button>
                  )}
                </div>
              </div>
              {order.coupon && (
                <div className="mt-4 border-t border-admin-line pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-admin-faint">
                    Coupon
                  </p>
                  <code className="mt-1.5 inline-block rounded bg-admin-subtle px-2 py-0.5 text-sm font-semibold text-admin-heading">
                    {order.coupon.code}
                  </code>
                  <p className="mt-1 text-sm text-admin-muted">
                    {order.coupon.type === "percentage"
                      ? `${order.coupon.value}%`
                      : money(order.coupon.value)}{" "}
                    off
                  </p>
                  <p className="text-sm font-medium text-admin-body">
                    -{money(order.coupon.discountAmount)}
                  </p>
                </div>
              )}
            </Surface>
          </Section>

          {order.notes && (
            <Section title="Notes">
              <Surface>
                <p className="text-sm text-admin-muted">{order.notes}</p>
              </Surface>
            </Section>
          )}
        </div>
      </div>

      {allowedTransitions.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-admin-line bg-admin-surface/95 p-3 backdrop-blur lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-[90rem] flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-admin-muted">
                Status: <span className="font-medium capitalize text-admin-heading">{order.status}</span>
              </p>
              <StatusBadge status={order.status} />
            </div>
            <div className="flex flex-wrap gap-2">{renderStatusButtons()}</div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingStatus === "cancelled"}
        title="Cancel this order?"
        message="Cancelling cannot be undone from this screen. Inventory may be restored if it was deducted. Confirm only if this order should not be fulfilled."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        variant="danger"
        loading={updating}
        onConfirm={() => void updateStatus("cancelled")}
        onCancel={() => !updating && setPendingStatus(null)}
      />
      <ConfirmDialog
        open={pendingStatus === "refunded"}
        title="Mark this order as refunded?"
        message="This records a refund in the order status machine. It does not by itself send money back through the payment provider."
        confirmLabel="Mark refunded"
        cancelLabel="Go back"
        variant="danger"
        loading={updating}
        onConfirm={() => void updateStatus("refunded")}
        onCancel={() => !updating && setPendingStatus(null)}
      />
    </div>
  );
}
