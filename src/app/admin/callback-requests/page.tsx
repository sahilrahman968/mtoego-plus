"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getAdminCallbackRequests,
  updateAdminCallbackRequest,
  type AdminCallbackRequestData,
  type AdminCallbackRequestsData,
} from "@/lib/store-api";

const statusFilters = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Closed", value: "closed" },
] as const;

const statusOrder: Array<AdminCallbackRequestData["status"]> = ["new", "contacted", "closed"];

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export default function AdminCallbackRequestsPage() {
  const [data, setData] = useState<AdminCallbackRequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | "new" | "contacted" | "closed">("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const res = await getAdminCallbackRequests({
      page,
      limit: 15,
      status: status || undefined,
      search,
    });
    if (res.success && res.data) {
      setData(res.data);
    } else {
      setData(null);
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  const updateStatus = async (
    requestItem: AdminCallbackRequestData,
    nextStatus: AdminCallbackRequestData["status"]
  ) => {
    if (nextStatus === requestItem.status) return;
    const defaultNote = requestItem.adminNote ?? "";
    const adminNote = window.prompt("Add an internal note (optional):", defaultNote);
    if (adminNote === null) return;

    setProcessingId(requestItem._id);
    const res = await updateAdminCallbackRequest(requestItem._id, {
      status: nextStatus,
      adminNote,
    });
    if (res.success) {
      await loadRequests();
    }
    setProcessingId(null);
  };

  return (
    <div>
      <PageHeader
        title="Customisation Requests"
        description="Manage callback requests from the landing page popup"
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by requirement, phone, or hours..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-96 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
        <div className="flex flex-wrap gap-1.5">
          {statusFilters.map((filter) => (
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
            title="No requests found"
            description="New customisation and bulk-order requests will appear here."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Submitted</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Phone</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">
                      Preferred Hours
                    </th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Requirement</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">
                      Status
                    </th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((requestItem) => (
                    <tr key={requestItem._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 min-w-40 text-slate-600">
                        {formatDateTime(requestItem.createdAt)}
                      </td>
                      <td className="px-4 py-3 min-w-32 font-medium text-slate-900">
                        {requestItem.phone}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-700 min-w-40">
                        {requestItem.contactHours}
                      </td>
                      <td className="px-4 py-3 min-w-72">
                        <p className="line-clamp-2 text-slate-700">{requestItem.requirement}</p>
                        {requestItem.adminNote ? (
                          <p className="mt-1 text-xs text-slate-500">Note: {requestItem.adminNote}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            requestItem.status === "new"
                              ? "bg-blue-100 text-blue-700"
                              : requestItem.status === "contacted"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {requestItem.status}
                        </span>
                        {requestItem.contactedAt ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Contacted: {formatDateTime(requestItem.contactedAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {statusOrder.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={
                                processingId === requestItem._id || requestItem.status === nextStatus
                              }
                              onClick={() => updateStatus(requestItem, nextStatus)}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                                requestItem.status === nextStatus
                                  ? "bg-slate-900 text-white"
                                  : "text-slate-700 hover:bg-slate-100"
                              }`}
                            >
                              {nextStatus}
                            </button>
                          ))}
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
