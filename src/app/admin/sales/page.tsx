"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Copy, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button, ButtonLink } from "../components/Button";

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

type SaleStatus = "all" | "live" | "scheduled" | "paused" | "ended";
const PAGE_SIZE = 15;

export default function SalesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SaleStatus>("all");
  const [deleteTarget, setDeleteTarget] = useState<SaleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/sales?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setLoadError(true);
    } catch (err) {
      console.error("Failed to fetch sales:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/sales/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        void fetchSales();
      } else {
        setActionError(json.error || json.message || "Failed to delete sale");
      }
    } catch (err) {
      console.error("Failed to delete sale:", err);
      setActionError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const duplicate = async (sale: SaleRow) => {
    setCopyingId(sale._id);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/sales/${sale._id}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (json.success) void fetchSales();
      else setActionError(json.error || json.message || `Failed to copy ${sale.title}`);
    } catch {
      setActionError(`Failed to copy ${sale.title}. Please try again.`);
    } finally {
      setCopyingId(null);
    }
  };

  const isFiltered = Boolean(search || status !== "all");
  const rangeStart = data?.total ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Flash campaigns, scheduled drops, and merchandised discounts"
        action={{ label: "Create sale", href: "/admin/sales/new" }}
      />

      <SearchFilterBar
        id="sale-search"
        value={searchInput}
        onChange={setSearchInput}
        label="Search sales"
        placeholder="Search by campaign or URL…"
      >
        <FilterSelect
          id="sale-status"
          label="Filter sales by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as SaleStatus);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="live">Live</option>
          <option value="scheduled">Scheduled</option>
          <option value="paused">Paused</option>
          <option value="ended">Ended</option>
        </FilterSelect>
      </SearchFilterBar>

      {actionError && (
        <div role="alert" className="mb-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger">
          {actionError}
        </div>
      )}

      {loadError ? (
        <AdminErrorState
          title="Unable to load sales"
          message="The campaigns could not be fetched. Check your connection and try again."
          onRetry={fetchSales}
        />
      ) : (
        <>
          {data && data.total > 0 && (
            <p className="mb-2 text-xs tabular text-admin-muted" aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {data.total} sale{data.total === 1 ? "" : "s"}
            </p>
          )}
          <DataTableShell
            label="Sales"
            footer={data && data.totalPages > 1 ? (
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            ) : undefined}
          >
            {loading ? (
              <AdminTableSkeleton rows={PAGE_SIZE} columns={5} />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching sales" : "No sale campaigns"}
                description={isFiltered
                  ? "No campaign matches the current search and status. Try widening the filters."
                  : "Launch a timed sale with a banner, URL, and discounted products."}
                action={!isFiltered ? { label: "Create sale", href: "/admin/sales/new" } : undefined}
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/60">
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Campaign</th>
                    <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell">Window</th>
                    <th scope="col" className="hidden px-4 py-2 text-right text-xs font-medium text-admin-muted sm:table-cell">Products</th>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Status</th>
                    <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted xl:table-cell">Performance</th>
                    <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((sale) => (
                    <tr key={sale._id} className="transition-colors hover:bg-admin-hover">
                      <td className="px-4 py-2">
                        <p className="max-w-64 truncate font-medium text-admin-heading">{sale.title}</p>
                        <p className="max-w-64 truncate font-mono text-xs text-admin-faint">/sale/{sale.slug}</p>
                        <p className="mt-0.5 text-xs text-admin-muted md:hidden">
                          {new Date(sale.startsAt).toLocaleDateString("en-IN")} – {new Date(sale.endsAt).toLocaleDateString("en-IN")}
                        </p>
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-2 text-admin-muted md:table-cell">
                        {new Date(sale.startsAt).toLocaleDateString("en-IN")} – {new Date(sale.endsAt).toLocaleDateString("en-IN")}
                      </td>
                      <td className="hidden px-4 py-2 text-right tabular text-admin-body sm:table-cell">{sale.itemCount}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={sale.status} />
                          {sale.showOnHome && <span className="rounded-full bg-admin-info-soft px-2 py-0.5 text-xs text-admin-info">Home</span>}
                        </div>
                      </td>
                      <td className="hidden px-4 py-2 text-xs text-admin-muted xl:table-cell">
                        <span className="tabular">{sale.stats?.views || 0} views · {sale.stats?.orders || 0} orders</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <ButtonLink href={`/admin/sales/${sale._id}`} variant="ghost" size="sm" className="px-2" aria-label={`Edit ${sale.title}`} icon={<Pencil aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Edit</span></ButtonLink>
                          <ButtonLink href={`/admin/sales/${sale._id}/performance`} variant="ghost" size="sm" className="px-2" aria-label={`View performance for ${sale.title}`} icon={<BarChart3 aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Performance</span></ButtonLink>
                          <Button variant="ghost" size="sm" className="px-2" disabled={copyingId === sale._id} onClick={() => void duplicate(sale)} aria-label={`Copy ${sale.title}`} icon={<Copy aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">{copyingId === sale._id ? "Copying…" : "Copy"}</span></Button>
                          <Button variant="ghost" size="sm" className="px-2 hover:bg-admin-danger-soft hover:text-admin-danger" onClick={() => { setDeleteTarget(sale); setActionError(""); }} aria-label={`Delete ${sale.title}`} icon={<Trash2 aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Delete</span></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataTableShell>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete sale?"
        message={actionError || `This removes “${deleteTarget?.title}”. Live prices will revert to catalog pricing.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setActionError(""); }}
      />
    </div>
  );
}
