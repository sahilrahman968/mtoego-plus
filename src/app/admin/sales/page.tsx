"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

interface SaleRow {
  _id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  showOnHome: boolean;
  status: string;
  itemCount: number;
  stats?: { views: number; orders: number; revenue: number };
}

interface PaginatedResponse {
  items: SaleRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SalesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sales?page=${page}&limit=15`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sales/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchSales();
      }
    } catch (err) {
      console.error("Failed to delete sale:", err);
    } finally {
      setDeleting(false);
    }
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/admin/sales/${id}/duplicate`, { method: "POST" });
    const json = await res.json();
    if (json.success) fetchSales();
  };

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Flash campaigns, scheduled drops, and merchandised discounts"
        action={{ label: "Create sale", href: "/admin/sales/new" }}
      />

      <div className="bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No sale campaigns"
            description="Launch a timed sale with a banner, URL, and discounted products"
            action={{ label: "Create sale", href: "/admin/sales/new" }}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/50">
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Campaign</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden md:table-cell">Window</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden lg:table-cell">Products</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Status</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden xl:table-cell">Perf</th>
                    <th className="text-right font-medium text-admin-muted px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((sale) => (
                    <tr key={sale._id} className="hover:bg-admin-hover">
                      <td className="px-4 py-3">
                        <p className="font-medium text-admin-heading">{sale.title}</p>
                        <p className="text-xs text-admin-faint">/sale/{sale.slug}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-admin-muted">
                        {new Date(sale.startsAt).toLocaleDateString("en-IN")} –{" "}
                        {new Date(sale.endsAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">{sale.itemCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sale.status} />
                        {sale.showOnHome && (
                          <span className="ml-2 text-[10px] uppercase text-admin-faint">Home</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-admin-muted">
                        {sale.stats?.views || 0} views · {sale.stats?.orders || 0} orders
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <Link href={`/admin/sales/${sale._id}`} className="text-admin-body hover:underline">
                            Edit
                          </Link>
                          <Link
                            href={`/admin/sales/${sale._id}/performance`}
                            className="text-admin-body hover:underline"
                          >
                            Analytics
                          </Link>
                          <button type="button" onClick={() => duplicate(sale._id)} className="text-admin-muted">
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sale)}
                            className="text-admin-danger"
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
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete sale?"
        message={`This removes “${deleteTarget?.title}”. Live prices will revert to catalog pricing.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
