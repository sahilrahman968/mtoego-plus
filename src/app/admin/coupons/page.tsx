"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

interface Coupon {
  _id: string;
  code: string;
  description?: string;
  type: "percentage" | "flat";
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Coupon[];
  total: number;
  page: number;
  totalPages: number;
}

export default function CouponsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons?page=${page}&limit=15`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchCoupons();
      }
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    } finally {
      setDeleting(false);
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Manage discount codes and promotions"
        action={{ label: "Add Coupon", href: "/admin/coupons/new" }}
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No coupons found"
            description="Create your first coupon to offer discounts"
            action={{ label: "Add Coupon", href: "/admin/coupons/new" }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Code</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Type</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden sm:table-cell">Value</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Usage</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Expires</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((coupon) => (
                    <tr key={coupon._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <code className="text-sm font-semibold text-slate-900 bg-slate-50 px-2 py-0.5 rounded">
                          {coupon.code}
                        </code>
                        {coupon.description && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={coupon.type} />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-medium text-slate-900">
                          {coupon.type === "percentage" ? `${coupon.value}%` : `₹${coupon.value}`}
                        </span>
                        {coupon.minOrderValue > 0 && (
                          <p className="text-xs text-slate-400">Min: ₹{coupon.minOrderValue}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-600">
                          {coupon.usedCount} / {coupon.usageLimit}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={isExpired(coupon.expiresAt) ? "text-gray-500" : "text-slate-600"}>
                          {new Date(coupon.expiresAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {isExpired(coupon.expiresAt) && (
                            <span className="text-xs ml-1">(expired)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={coupon.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/coupons/${coupon._id}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(coupon)}
                            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            Delete
                          </button>
                        </div>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Coupon"
        message={`Are you sure you want to delete coupon "${deleteTarget?.code}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
