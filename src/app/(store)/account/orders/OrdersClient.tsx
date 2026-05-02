"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Package, ChevronRight, Clock, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getOrders, type OrderListItem } from "@/lib/store-api";
import { formatPrice } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "border border-[#4A3B17] bg-[#251D0D] text-[#D4A64C]",
  paid: "border border-primary/45 bg-primary/15 text-primary",
  processing: "border border-[#3A2F52] bg-[#1B1627] text-[#A68CFF]",
  shipped: "border border-[#264352] bg-[#111E26] text-[#6FBEE9]",
  delivered: "border border-[#1E4C33] bg-[#10241A] text-[#6DD79C]",
  cancelled: "border border-[#5A232F] bg-[#2A1218] text-[#F08095]",
  refunded: "border border-[#4F355E] bg-[#24172C] text-[#D09EFF]",
};

export default function OrdersClient() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const res = await getOrders({ page, limit: 10, status: statusFilter || undefined });
    if (res.success && res.data) {
      setOrders(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) loadOrders();
  }, [isAuthenticated, loadOrders]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <Package size={48} className="mx-auto mb-4 text-muted/40" />
        <h1 className="text-3xl font-bold uppercase tracking-[0.06em] text-foreground">My Orders</h1>
        <p className="text-muted mt-2">Please login to view your orders</p>
        <Link
          href="/login?redirect=/account/orders"
          className="mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-primary-dark"
        >
          Login to Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-5">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/90">
            03 / Account
          </p>
          <h1 className="text-4xl font-bold uppercase tracking-[0.05em] text-foreground sm:text-5xl">My Orders</h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
            {total} order{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-border bg-black/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground outline-none transition-colors focus:border-primary"
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse-slow border border-border bg-card-hover" />
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order._id}
                href={`/account/orders/${order._id}`}
                className="block border border-border bg-card/75 p-4 transition-all hover:border-primary/35 hover:bg-card sm:p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base font-bold uppercase tracking-[0.04em] text-foreground">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] capitalize ${
                          STATUS_COLORS[order.status] || "border border-border bg-card text-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-muted line-clamp-2">
                      {order.items
                        .map((item) => `${item.title} × ${item.quantity}`)
                        .join(", ")}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold text-foreground">
                      {formatPrice(order.pricing.grandTotal)}
                    </span>
                    <ChevronRight size={16} className="text-muted" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="border border-border bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-4 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="border border-border bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] hover:border-primary/45 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <Package size={48} className="mx-auto mb-4 text-muted/40" />
          <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-foreground">No orders yet</h2>
          <p className="text-sm text-muted mt-1">
            When you make a purchase, your orders will appear here
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:underline"
          >
            Start Shopping
          </Link>
        </div>
      )}
    </div>
  );
}
