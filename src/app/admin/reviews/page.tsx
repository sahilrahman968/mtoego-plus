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
          className="w-full sm:w-80 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
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
                  ? "bg-gray-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Product</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Customer</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Rating</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Comment</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Status</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((review) => (
                    <tr key={review._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 min-w-44">
                        {review.product?.slug ? (
                          <Link
                            href={`/products/${review.product.slug}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {review.product.title}
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-900">Deleted product</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="min-w-0">
                          <p className="text-slate-700 truncate">{review.user?.name || "Deleted user"}</p>
                          <p className="text-xs text-slate-400 truncate">{review.user?.email || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{review.rating}/5</td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="line-clamp-2 text-slate-600">{review.comment}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {review.isHidden ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">
                            Hidden
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
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
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                          >
                            {review.isHidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            type="button"
                            disabled={processingId === review._id}
                            onClick={() => handleDelete(review)}
                            className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50"
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
    </div>
  );
}
