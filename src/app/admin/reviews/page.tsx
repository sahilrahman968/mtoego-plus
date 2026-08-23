"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button } from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import {
  deleteAdminReview,
  getAdminReviews,
  moderateAdminReview,
  type AdminReviewData,
  type AdminReviewsData,
} from "@/lib/store-api";

type ReviewStatus = "" | "visible" | "hidden";
const PAGE_SIZE = 15;

export default function AdminReviewsPage() {
  const [data, setData] = useState<AdminReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ReviewStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReviewData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await getAdminReviews({ page, limit: PAGE_SIZE, status: status || undefined, search });
    if (res.success && res.data) setData(res.data);
    else {
      setData(null);
      setLoadError(true);
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReviews();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReviews]);

  const handleToggleVisibility = async (review: AdminReviewData) => {
    setProcessingId(review._id);
    setActionError("");
    const hide = !review.isHidden;
    const hiddenReason = hide ? "Hidden by moderator" : "";
    const res = await moderateAdminReview(review._id, { isHidden: hide, hiddenReason });
    if (res.success) await loadReviews();
    else setActionError(res.message || "Failed to update review visibility");
    setProcessingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setProcessingId(deleteTarget._id);
    setActionError("");
    const res = await deleteAdminReview(deleteTarget._id);
    if (res.success) {
      setDeleteTarget(null);
      await loadReviews();
    } else {
      setActionError(res.message || "Failed to delete review");
    }
    setProcessingId(null);
  };

  const isFiltered = Boolean(search || status);

  return (
    <div>
      <PageHeader title="Reviews" description="Moderate customer product reviews" />
      <SearchFilterBar id="review-search" value={searchInput} onChange={setSearchInput} label="Search reviews" placeholder="Search review comments…">
        <FilterSelect id="review-status" label="Filter reviews by visibility" value={status} onChange={(event) => { setStatus(event.target.value as ReviewStatus); setPage(1); }}>
          <option value="">All reviews</option>
          <option value="visible">Visible only</option>
          <option value="hidden">Hidden only</option>
        </FilterSelect>
      </SearchFilterBar>

      {actionError && !deleteTarget && <div role="alert" className="mb-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger">{actionError}</div>}

      {loadError ? (
        <AdminErrorState title="Unable to load reviews" message="The review queue could not be fetched. Check your connection and try again." onRetry={loadReviews} />
      ) : (
        <DataTableShell
          label="Customer reviews"
          footer={data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} /> : undefined}
        >
          {loading ? (
            <AdminTableSkeleton rows={PAGE_SIZE} columns={5} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState title={isFiltered ? "No matching reviews" : "No reviews found"} description={isFiltered ? "No review matches the current search and visibility filter." : "Customer reviews will appear here when submitted."} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-line bg-admin-subtle/60">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Product</th>
                  <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell">Customer</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Rating</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Comment</th>
                  <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted lg:table-cell">Status</th>
                  <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {data.items.map((review) => (
                  <tr key={review._id} className="transition-colors hover:bg-admin-hover">
                    <td className="min-w-44 px-4 py-2">
                      {review.product?.slug ? <Link href={`/products/${review.product.slug}`} className="font-medium text-admin-heading hover:underline">{review.product.title}</Link> : <span className="font-medium text-admin-heading">Deleted product</span>}
                    </td>
                    <td className="hidden px-4 py-2 md:table-cell">
                      <p className="max-w-48 truncate text-admin-body">{review.user?.name || "Deleted user"}</p>
                      <p className="max-w-48 truncate text-xs text-admin-faint">{review.user?.email || ""}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 font-medium text-admin-body"><span className="text-admin-warning" aria-hidden="true">★</span> {review.rating}/5</td>
                    <td className="max-w-md px-4 py-2"><p className="line-clamp-2 text-admin-muted">{review.comment}</p></td>
                    <td className="hidden px-4 py-2 lg:table-cell"><StatusBadge status={review.isHidden ? "hidden" : "visible"} /></td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2"
                          disabled={processingId === review._id}
                          onClick={() => void handleToggleVisibility(review)}
                          aria-label={`${review.isHidden ? "Unhide" : "Hide"} review for ${review.product?.title || "deleted product"}`}
                          icon={review.isHidden ? <Eye aria-hidden="true" className="size-4" /> : <EyeOff aria-hidden="true" className="size-4" />}
                        ><span className="hidden lg:inline">{review.isHidden ? "Unhide" : "Hide"}</span></Button>
                        <Button variant="ghost" size="sm" className="px-2 hover:bg-admin-danger-soft hover:text-admin-danger" disabled={processingId === review._id} onClick={() => { setDeleteTarget(review); setActionError(""); }} aria-label="Delete review permanently" icon={<Trash2 aria-hidden="true" className="size-4" />}><span className="hidden lg:inline">Delete</span></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTableShell>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete review permanently?"
        message={actionError || `This permanently removes the ${deleteTarget?.rating}/5 review and cannot be undone.`}
        confirmLabel="Delete review"
        variant="danger"
        loading={processingId === deleteTarget?._id}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setActionError(""); }}
      />
    </div>
  );
}
