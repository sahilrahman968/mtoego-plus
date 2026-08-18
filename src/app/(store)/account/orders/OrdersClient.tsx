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
import { OrderListCardSkeleton } from "@/components/store/skeletons";

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
  pending: "text-[#D4A64C]",
  paid: "text-primary",
  processing: "text-[#A68CFF]",
  shipped: "text-[#6FBEE9]",
  delivered: "text-[#6DD79C]",
  cancelled: "text-[#F08095]",
  refunded: "text-[#D09EFF]",
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
            className="relative h-10 w-10 shrink-0 overflow-hidden border border-border bg-black/40"
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
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card via-card/80 to-transparent backdrop-blur-[1px]"
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
    if (isAuthenticated) loadOrders();
  }, [isAuthenticated, loadOrders]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <Package size={48} className="mx-auto mb-4 text-muted/40" />
        <h1 className="text-3xl text-foreground">My Orders</h1>
        <p className="body-copy mx-auto mt-3 text-muted">Please login to view your orders</p>
        <Link
          href="/login?redirect=/account/orders"
          className="btn-text mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <div className="mb-6 border-b border-border/60 pb-5">
        <p className="eyebrow mb-3 text-primary/90">
          03 / Account
        </p>
        <h1 className="section-title text-3xl text-foreground sm:text-5xl">
          My Orders
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
                  className="block border border-border bg-card/75 p-4 transition-all hover:border-primary/35 hover:bg-card sm:p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          size={16}
                          className={`shrink-0 ${statusColor}`}
                          aria-label={order.status}
                        />
                        <span className="tabular truncate text-sm font-bold uppercase text-foreground sm:text-base">
                          {order.orderNumber}
                        </span>
                      </div>

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
                      <ChevronRight size={16} className="text-muted" />
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
                className="btn-text border border-border bg-black/45 px-4 py-2.5 hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="btn-text tabular px-4 text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-text border border-border bg-black/45 px-4 py-2.5 hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <Package size={48} className="mx-auto mb-4 text-muted/40" />
          <h2 className="text-lg text-foreground">No orders yet</h2>
          <p className="body-copy mx-auto mt-2 text-muted">
            When you make a purchase, your orders will appear here
          </p>
          <Link
            href="/products"
            className="btn-text mt-5 inline-flex items-center gap-2 text-primary hover:underline"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
