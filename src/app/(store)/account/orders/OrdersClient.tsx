"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  ChevronRight,
  Clock,
  Banknote,
  Check,
  Truck,
  AlertCircle,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrders, type OrderListItem } from "@/lib/store-api";
import { formatPrice, getProductImage } from "@/lib/utils";
import { OrderListCardSkeleton } from "@/components/jewellery/shared/Skeletons";

const STATUS_ICONS: Record<string, LucideIcon> = {
  pending: Clock,
  paid: Banknote,
  processing: Package,
  shipped: Truck,
  delivered: Check,
  cancelled: AlertCircle,
  refunded: RotateCcw,
};

const STATUS_ICON_COLORS: Record<string, string> = {
  pending: "text-primary",
  paid: "text-primary",
  processing: "text-primary",
  shipped: "text-primary",
  delivered: "text-success",
  cancelled: "text-danger",
  refunded: "text-muted",
};

function OrderProductThumbnails({
  items,
}: {
  items: OrderListItem["items"];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setOverflows(el.scrollWidth > el.clientWidth + 1);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="relative mt-2.5 max-w-full">
      <div
        ref={scrollerRef}
        className="flex gap-1.5 overflow-hidden"
      >
        {items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="relative h-12 w-12 shrink-0 overflow-hidden bg-[#EEE9E0]"
          >
            <Image
              src={getProductImage(item.product?.images)}
              alt={item.title}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {overflows && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card via-card/80 to-transparent"
        />
      )}
    </div>
  );
}

export default function OrdersClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const res = await getOrders({ page, limit: 10 });
    if (res.success && res.data) {
      setOrders(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = window.setTimeout(() => void loadOrders(), 0);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, loadOrders]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-20 text-center">
        <div className="w-full border border-border bg-card px-6 py-14 shadow-[0_24px_70px_rgba(61,45,24,0.08)] sm:px-12">
        <Package size={42} strokeWidth={1.25} className="mx-auto mb-6 text-primary" aria-hidden="true" />
        <p className="eyebrow mb-3 text-primary">Your account</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">My Orders</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Sign in to view your order history and current status.</p>
        <Link
          href="/login?redirect=/account/orders"
          className="btn-text mt-7 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary"
        >
          Login to Continue
        </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 border-b border-border pb-6 sm:mb-10">
        <p className="eyebrow mb-3 text-primary">Your account</p>
        <h1 className="section-title text-3xl text-foreground sm:text-5xl">
          Order History
        </h1>
        <p className="eyebrow-xs tabular mt-2.5 text-muted">
          {total} order{total !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <OrderListCardSkeleton key={i} />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => {
              const StatusIcon = STATUS_ICONS[order.status] || Package;
              const statusColor =
                STATUS_ICON_COLORS[order.status] || "text-muted";

              return (
                <Link
                  key={order._id}
                  href={`/account/orders/${order._id}`}
                  className="group block border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-[#FBF8F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          size={16}
                          className={`shrink-0 ${statusColor}`}
                          aria-hidden="true"
                        />
                        <span className="tabular truncate text-sm font-bold uppercase text-foreground sm:text-base">
                          {order.orderNumber}
                        </span>
                      </div>
                      <p className={`eyebrow-xs mt-2 capitalize ${statusColor}`}>
                        {order.status}
                      </p>

                      <OrderProductThumbnails items={order.items} />

                      <div className="eyebrow-xs mt-2.5 flex items-center gap-3 text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(order.createdAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="price text-sm font-bold text-foreground sm:text-lg">
                        {formatPrice(order.pricing.grandTotal)}
                      </span>
                      <ChevronRight size={18} className="text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-text min-h-11 cursor-pointer border border-foreground bg-transparent px-4 py-2.5 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="btn-text tabular px-4 text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-text min-h-11 cursor-pointer border border-foreground bg-transparent px-4 py-2.5 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="border border-border bg-card px-6 py-16 text-center shadow-[0_24px_70px_rgba(61,45,24,0.06)]">
          <Package size={42} strokeWidth={1.25} className="mx-auto mb-5 text-primary" aria-hidden="true" />
          <h2 className="section-title text-2xl text-foreground">No orders yet</h2>
          <p className="body-copy mx-auto mt-2 text-muted">
            When you make a purchase, your orders will appear here
          </p>
          <Link
            href="/products"
            className="btn-text mt-6 inline-flex min-h-12 items-center gap-2 bg-foreground px-7 py-3.5 text-background transition-colors hover:bg-primary"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
