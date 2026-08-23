"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button } from "../components/Button";
import StatusBadge from "../components/StatusBadge";
import { controlClassName } from "../components/Fields";
import {
  getAdminCallbackRequests,
  updateAdminCallbackRequest,
  type AdminCallbackRequestData,
  type AdminCallbackRequestsData,
} from "@/lib/store-api";

type RequestStatus = "" | "new" | "contacted" | "closed";
const PAGE_SIZE = 15;
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

interface PendingStatus {
  request: AdminCallbackRequestData;
  status: AdminCallbackRequestData["status"];
}

export default function AdminCallbackRequestsPage() {
  const [data, setData] = useState<AdminCallbackRequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<RequestStatus>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PendingStatus | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const res = await getAdminCallbackRequests({
      page,
      limit: PAGE_SIZE,
      status: status || undefined,
      search,
    });
    if (res.success && res.data) setData(res.data);
    else {
      setData(null);
      setLoadError(true);
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequests();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadRequests]);

  const updateStatus = async (adminNote: string) => {
    if (!pendingStatus) return;
    setProcessingId(pendingStatus.request._id);
    setActionError("");
    const res = await updateAdminCallbackRequest(pendingStatus.request._id, {
      status: pendingStatus.status,
      adminNote,
    });
    if (res.success) {
      setPendingStatus(null);
      await loadRequests();
    } else {
      setActionError(res.message || "Failed to update callback request");
    }
    setProcessingId(null);
  };

  const isFiltered = Boolean(search || status);

  return (
    <div>
      <PageHeader title="Customisation Requests" description="Manage callback requests from the landing page popup" />
      <SearchFilterBar id="callback-search" value={searchInput} onChange={setSearchInput} label="Search callback requests" placeholder="Search requirement, phone, or hours…">
        <FilterSelect id="callback-status" label="Filter callback requests by status" value={status} onChange={(event) => { setStatus(event.target.value as RequestStatus); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </FilterSelect>
      </SearchFilterBar>

      {actionError && !pendingStatus && <div role="alert" className="mb-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger">{actionError}</div>}

      {loadError ? (
        <AdminErrorState title="Unable to load requests" message="The callback queue could not be fetched. Check your connection and try again." onRetry={loadRequests} />
      ) : (
        <DataTableShell
          label="Customisation callback requests"
          footer={data && data.totalPages > 1 ? <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} /> : undefined}
        >
          {loading ? (
            <AdminTableSkeleton rows={PAGE_SIZE} columns={5} />
          ) : !data || data.items.length === 0 ? (
            <EmptyState title={isFiltered ? "No matching requests" : "No requests found"} description={isFiltered ? "No request matches the current search and status filter." : "New customisation and bulk-order requests will appear here."} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-admin-line bg-admin-subtle/60">
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Submitted</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Phone</th>
                  <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell">Preferred hours</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-admin-muted">Requirement</th>
                  <th scope="col" className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted lg:table-cell">Status</th>
                  <th scope="col" className="px-4 py-2 text-right"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-line">
                {data.items.map((requestItem) => (
                  <tr key={requestItem._id} className="transition-colors hover:bg-admin-hover">
                    <td className="min-w-40 whitespace-nowrap px-4 py-2 text-admin-muted">{formatDateTime(requestItem.createdAt)}</td>
                    <td className="min-w-32 px-4 py-2 font-medium text-admin-heading">
                      <a href={`tel:${requestItem.phone}`} className="hover:underline">{requestItem.phone}</a>
                    </td>
                    <td className="hidden min-w-40 px-4 py-2 text-admin-body md:table-cell">{requestItem.contactHours}</td>
                    <td className="min-w-72 max-w-xl px-4 py-2">
                      <p className="line-clamp-2 text-admin-body">{requestItem.requirement}</p>
                      {requestItem.adminNote && <p className="mt-1 line-clamp-1 text-xs text-admin-muted">Note: {requestItem.adminNote}</p>}
                      <div className="mt-1 lg:hidden"><StatusBadge status={requestItem.status} /></div>
                    </td>
                    <td className="hidden px-4 py-2 lg:table-cell">
                      <StatusBadge status={requestItem.status} />
                      {requestItem.contactedAt && <p className="mt-1 whitespace-nowrap text-[11px] text-admin-muted">Contacted: {formatDateTime(requestItem.contactedAt)}</p>}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {statusOrder.map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            variant={requestItem.status === nextStatus ? "secondary" : "ghost"}
                            size="sm"
                            className="px-2 capitalize"
                            disabled={processingId === requestItem._id || requestItem.status === nextStatus}
                            onClick={() => { setPendingStatus({ request: requestItem, status: nextStatus }); setActionError(""); }}
                            aria-label={`Mark ${requestItem.phone} as ${nextStatus}`}
                          >
                            {nextStatus}
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DataTableShell>
      )}

      <StatusNoteDialog
        key={pendingStatus ? `${pendingStatus.request._id}-${pendingStatus.status}` : "closed"}
        pending={pendingStatus}
        loading={processingId === pendingStatus?.request._id}
        error={actionError}
        onCancel={() => { setPendingStatus(null); setActionError(""); }}
        onSubmit={updateStatus}
      />
    </div>
  );
}

function StatusNoteDialog({
  pending,
  loading,
  error,
  onCancel,
  onSubmit,
}: {
  pending: PendingStatus | null;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (note: string) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const priorFocus = useRef<HTMLElement | null>(null);
  const [note, setNote] = useState(pending?.request.adminNote ?? "");

  useEffect(() => {
    if (!pending) return;
    priorFocus.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => noteRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onCancel();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflow;
      priorFocus.current?.focus();
    };
  }, [loading, onCancel, pending]);

  if (!pending) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-admin-heading/40 backdrop-blur-[1px]" aria-hidden="true" onClick={() => !loading && onCancel()} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="relative w-full rounded-t-xl border border-admin-line bg-admin-surface p-5 shadow-2xl sm:max-w-md sm:rounded-xl">
        <h2 id={titleId} className="text-base font-semibold text-admin-heading">Update request status</h2>
        <p id={descriptionId} className="mt-1 text-sm text-admin-muted">
          Mark {pending.request.phone} as <strong className="font-medium text-admin-body">{pending.status}</strong>. Add or update the internal note before saving.
        </p>
        {error && <div role="alert" className="mt-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3 py-2 text-sm text-admin-danger">{error}</div>}
        <label htmlFor={noteId} className="mt-4 block text-sm font-medium text-admin-body">Internal note <span className="font-normal text-admin-muted">(optional)</span></label>
        <textarea ref={noteRef} id={noteId} value={note} onChange={(event) => setNote(event.target.value)} rows={4} className={`mt-1.5 min-h-24 resize-y ${controlClassName}`} placeholder="Add context for the team…" />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={() => onSubmit(note)} disabled={loading} icon={<ArrowRight aria-hidden="true" className="size-4" />}>{loading ? "Saving…" : `Mark ${pending.status}`}</Button>
        </div>
      </div>
    </div>
  );
}
