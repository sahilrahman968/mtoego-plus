"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button, ButtonLink } from "../components/Button";

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
  applicableProducts?: string[];
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Coupon[];
  total: number;
  page: number;
  totalPages: number;
}

type ActiveFilter = "all" | "active" | "inactive";
const PAGE_SIZE = 15;

export default function CouponsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (activeFilter !== "all") params.set("isActive", String(activeFilter === "active"));
      const res = await fetch(`/api/admin/coupons?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setLoadError(true);
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [activeFilter, page, search]);

  useEffect(() => {
    void fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        void fetchCoupons();
      } else {
        setActionError(json.message || "Failed to delete coupon");
      }
    } catch (err) {
      console.error("Failed to delete coupon:", err);
      setActionError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const isFiltered = Boolean(search || activeFilter !== "all");
  const rangeStart = data?.total ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Manage discount codes and promotions"
        action={{ label: "Add Coupon", href: "/admin/coupons/new" }}
      />

      <SearchFilterBar id="coupon-search" value={searchInput} onChange={setSearchInput} label="Search coupons" placeholder="Search coupon codes…">
        <FilterSelect
          id="coupon-status"
          label="Filter coupons by status"
          value={activeFilter}
          onChange={(event) => {
            setActiveFilter(event.target.value as ActiveFilter);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </FilterSelect>
      </SearchFilterBar>

      {loadError ? (
        <AdminErrorState
          title="Unable to load coupons"
          message="The coupon list could not be fetched. Check your connection and try again."
          onRetry={fetchCoupons}
        />
      ) : (
        <>
          {data && data.total > 0 && (
            <p className="mb-2 text-xs tabular text-admin-muted" aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {data.total} coupon{data.total === 1 ? "" : "s"}
            </p>
          )}
          <DataTableShell
            label="Coupons"
            footer={data && data.totalPages > 1 ? (
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            ) : undefined}
          >
            {loading ? (
              <AdminTableSkeleton rows={PAGE_SIZE} columns={5} />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching coupons" : "No coupons found"}
                description={isFiltered ? "No coupon matches the current search and status. Try widening the filters." : "Create your first coupon to offer discounts."}
                action={!isFiltered ? { label: "Add Coupon", href: "/admin/coupons/new" } : undefined}
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/60">
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Code</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Discount</th>
                    <th scope="col" className="hidden px-4 py-2 text-right text-xs font-medium text-admin-muted md:table-cell">Usage</th>
                    <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted lg:table-cell">Expires</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Status</th>
                    <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((coupon) => {
                    const expired = new Date(coupon.expiresAt) < new Date();
                    return (
                      <tr key={coupon._id} className="transition-colors hover:bg-admin-hover">
                        <td className="px-4 py-2">
                          <code className="rounded bg-admin-subtle px-2 py-0.5 text-sm font-semibold text-admin-heading">{coupon.code}</code>
                          {coupon.description && <p className="mt-1 max-w-64 truncate text-xs text-admin-faint">{coupon.description}</p>}
                          {(coupon.applicableProducts?.length ?? 0) > 0 && (
                            <p className="mt-1 text-xs text-admin-muted">
                              {coupon.applicableProducts!.length} product
                              {coupon.applicableProducts!.length === 1 ? "" : "s"}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <p className="whitespace-nowrap font-medium text-admin-heading">{coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}</p>
                          <p className="text-xs text-admin-faint">
                            {coupon.minOrderValue > 0 ? `Min ₹${coupon.minOrderValue}` : "No minimum"}
                            {coupon.type === "percentage" && coupon.maxDiscount != null ? ` · Max ₹${coupon.maxDiscount}` : ""}
                          </p>
                        </td>
                        <td className="hidden px-4 py-2 text-right tabular md:table-cell">
                          <p className="text-admin-body">{coupon.usedCount} / {coupon.usageLimit}</p>
                          <p className="text-xs text-admin-faint">{coupon.perUserLimit} per customer</p>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-admin-muted lg:table-cell">
                          {new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {expired && <span className="ml-1 text-xs text-admin-danger">(expired)</span>}
                        </td>
                        <td className="px-4 py-2"><StatusBadge status={coupon.isActive ? "active" : "inactive"} /></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <ButtonLink href={`/admin/coupons/${coupon._id}`} variant="ghost" size="sm" className="px-2" aria-label={`Edit ${coupon.code}`} icon={<Pencil aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Edit</span></ButtonLink>
                            <Button variant="ghost" size="sm" className="px-2 hover:bg-admin-danger-soft hover:text-admin-danger" onClick={() => { setDeleteTarget(coupon); setActionError(""); }} aria-label={`Delete ${coupon.code}`} icon={<Trash2 aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Delete</span></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTableShell>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Coupon"
        message={actionError || `Are you sure you want to delete coupon "${deleteTarget?.code}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setActionError(""); }}
      />
    </div>
  );
}
