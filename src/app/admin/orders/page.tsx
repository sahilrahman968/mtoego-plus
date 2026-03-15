"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";

interface Order {
  _id: string;
  orderNumber: string;
  user?: { _id: string; name: string; email: string };
  status: string;
  pricing: { grandTotal: number };
  items: { quantity: number }[];
  createdAt: string;
}

interface PaginatedResponse {
  items: Order[];
  total: number;
  page: number;
  totalPages: number;
}

const statusFilters = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Refunded", value: "refunded" },
];

export default function OrdersPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/orders?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalItems = (items: { quantity: number }[]) =>
    items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div>
      <PageHeader title="Orders" description="View and manage customer orders" />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by order # or customer..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-80 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatus(f.value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                status === f.value
                  ? "bg-gray-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={search || status ? "Try different filters" : "Orders will appear here once customers start purchasing"}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Order</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Customer</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden sm:table-cell">Items</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Total</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Date</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((order) => (
                    <tr key={order._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{order.orderNumber}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="min-w-0">
                          <p className="text-slate-700 truncate">{order.user?.name || "N/A"}</p>
                          <p className="text-xs text-slate-400 truncate">{order.user?.email || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-slate-600">{totalItems(order.items)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          ₹{order.pricing.grandTotal.toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/orders/${order._id}`}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-slate-100">
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
