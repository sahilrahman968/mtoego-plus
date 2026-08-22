"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  deleteAdminReview,
  getAdminReviews,
  moderateAdminReview,
  type AdminReviewData,
  type AdminReviewsData,
} from "@/lib/store-api";

const moderationFilters = [
  { label: "All", value: "" },
  { label: "Visible", value: "visible" },
  { label: "Hidden", value: "hidden" },
] as const;

export default function AdminReviewsPage() {
  const [data, setData] = useState<AdminReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | "visible" | "hidden">("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const res = await getAdminReviews({ page, limit: 15, status: status || undefined, search });
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setData(null);
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
    const hide = !review.isHidden;
    const hiddenReason = hide ? "Hidden by moderator" : "";
    const res = await moderateAdminReview(review._id, {
      isHidden: hide,
      hiddenReason,
    });
    if (res.success) {
      await loadReviews();
    }
    setProcessingId(null);
  };

  const handleDelete = async (review: AdminReviewData) => {
    const confirmed = window.confirm("Delete this review permanently?");
    if (!confirmed) return;
    setProcessingId(review._id);
    const res = await deleteAdminReview(review._id);
    if (res.success) {
      await loadReviews();
    }
    setProcessingId(null);
  };

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Moderate customer product reviews"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by comment text..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-80 px-4 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus focus:border-transparent"
        />
        <div className="flex flex-wrap gap-1.5">
          {moderationFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                status === filter.value
                  ? "bg-admin-primary text-white"
                  : "bg-admin-surface text-admin-muted border border-admin-line hover:bg-admin-hover"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No reviews found"
            description="Try changing filters or search terms."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/50">
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Product</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden md:table-cell">Customer</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Rating</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Comment</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden lg:table-cell">Status</th>
                    <th className="text-right font-medium text-admin-muted px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((review) => (
                    <tr key={review._id} className="hover:bg-admin-hover transition-colors">
                      <td className="px-4 py-3 min-w-44">
                        {review.product?.slug ? (
                          <Link
                            href={`/products/${review.product.slug}`}
                            className="font-medium text-admin-heading hover:underline"
                          >
                            {review.product.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-admin-heading">Deleted product</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="min-w-0">
                          <p className="text-admin-body truncate">{review.user?.name || "Deleted user"}</p>
                          <p className="text-xs text-admin-faint truncate">{review.user?.email || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-admin-body">{review.rating}/5</td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="line-clamp-2 text-admin-muted">{review.comment}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {review.isHidden ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-admin-danger-soft text-admin-danger">
                            Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-admin-success-soft text-admin-success">
                            Visible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={processingId === review._id}
                            onClick={() => handleToggleVisibility(review)}
                            className="px-2.5 py-1.5 text-xs font-medium text-admin-body hover:bg-admin-hover rounded-md transition-colors disabled:opacity-50"
                          >
                            {review.isHidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            type="button"
                            disabled={processingId === review._id}
                            onClick={() => handleDelete(review)}
                            className="px-2.5 py-1.5 text-xs font-medium text-admin-danger hover:bg-admin-danger-soft rounded-md transition-colors disabled:opacity-50"
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
            <div className="px-4 border-t border-admin-line">
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
