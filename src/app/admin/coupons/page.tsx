"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Pause, Play } from "lucide-react";
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
  name?: string;
  description?: string;
  customerDescription?: string;
  type: "percentage" | "flat";
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  startsAt?: string;
  expiresAt: string;
  status: "draft" | "active" | "paused" | "disabled";
  lifecycleStatus?: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  firstOrderOnly?: boolean;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Coupon[];
  total: number;
  page: number;
  totalPages: number;
}

type StatusFilter = "all" | "draft" | "active" | "paused" | "disabled" | "scheduled" | "expired" | "exhausted";
const PAGE_SIZE = 15;

export default function CouponsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
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
  }, [page, search, statusFilter]);

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

  const handlePauseResume = async (coupon: Coupon) => {
    const action = coupon.status === "paused" ? "resume" : "pause";
    setTogglingId(coupon._id);
    try {
      const res = await fetch(`/api/admin/coupons/${coupon._id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (json.success) void fetchCoupons();
    } catch (err) {
      console.error(`Failed to ${action} coupon:`, err);
    } finally {
      setTogglingId(null);
    }
  };

  const isFiltered = Boolean(search || statusFilter !== "all");
  const rangeStart = data?.total ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Promotion codes with eligibility rules, usage limits, and lifecycle control"
        action={{ label: "Add Coupon", href: "/admin/coupons/new" }}
      />

      <SearchFilterBar id="coupon-search" value={searchInput} onChange={setSearchInput} label="Search coupons" placeholder="Search code or name…">
        <FilterSelect
          id="coupon-status"
          label="Filter coupons by status"
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="draft">Draft</option>
          <option value="paused">Paused</option>
          <option value="expired">Expired</option>
          <option value="exhausted">Exhausted</option>
          <option value="disabled">Disabled</option>
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
                    <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted lg:table-cell">Validity</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Status</th>
                    <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((coupon) => {
                    const lifecycle = coupon.lifecycleStatus || (coupon.isActive ? "active" : "inactive");
                    const canPause = coupon.status === "active" || coupon.status === "paused";
                    return (
                      <tr key={coupon._id} className="transition-colors hover:bg-admin-hover">
                        <td className="px-4 py-2">
                          <code className="rounded bg-admin-subtle px-2 py-0.5 text-sm font-semibold text-admin-heading">{coupon.code}</code>
                          {(coupon.name || coupon.description) && (
                            <p className="mt-1 max-w-64 truncate text-xs text-admin-faint">
                              {coupon.name || coupon.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-admin-muted">
                            {(coupon.applicableProducts?.length ?? 0) > 0 && (
                              <span>{coupon.applicableProducts!.length} product{coupon.applicableProducts!.length === 1 ? "" : "s"}</span>
                            )}
                            {(coupon.applicableCategories?.length ?? 0) > 0 && (
                              <span>{coupon.applicableCategories!.length} categor{coupon.applicableCategories!.length === 1 ? "y" : "ies"}</span>
                            )}
                            {coupon.firstOrderOnly && <span>First order</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <p className="whitespace-nowrap font-medium text-admin-heading">{coupon.type === "percentage" ? `${coupon.value}% off` : `₹${coupon.value} off`}</p>
                          <p className="text-xs text-admin-faint">
                            {coupon.minOrderValue > 0 ? `Min ₹${coupon.minOrderValue}` : "No minimum"}
                            {coupon.type === "percentage" && coupon.maxDiscount != null ? ` · Max ₹${coupon.maxDiscount}` : ""}
                          </p>
                        </td>
                        <td className="hidden px-4 py-2 text-right tabular md:table-cell">
                          <p className="text-admin-body">
                            {coupon.usedCount} / {coupon.usageLimit === 0 ? "∞" : coupon.usageLimit}
                          </p>
                          <p className="text-xs text-admin-faint">
                            {coupon.perUserLimit === 0 ? "Unlimited" : `${coupon.perUserLimit}`} per customer
                          </p>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-admin-muted lg:table-cell">
                          {coupon.startsAt && (
                            <p className="text-xs text-admin-faint">
                              From {new Date(coupon.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          )}
                          <p>
                            Until {new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </td>
                        <td className="px-4 py-2"><StatusBadge status={lifecycle} /></td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            {canPause && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2"
                                disabled={togglingId === coupon._id}
                                onClick={() => void handlePauseResume(coupon)}
                                aria-label={coupon.status === "paused" ? `Resume ${coupon.code}` : `Pause ${coupon.code}`}
                                icon={
                                  coupon.status === "paused" ? (
                                    <Play aria-hidden="true" className="size-4" />
                                  ) : (
                                    <Pause aria-hidden="true" className="size-4" />
                                  )
                                }
                              >
                                <span className="hidden xl:inline">{coupon.status === "paused" ? "Resume" : "Pause"}</span>
                              </Button>
                            )}
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
        message={actionError || `Are you sure you want to delete coupon "${deleteTarget?.code}"? It will be soft-deleted and can no longer be redeemed.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setActionError(""); }}
      />
    </div>
  );
}
