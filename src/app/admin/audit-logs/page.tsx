"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import Pagination from "../components/Pagination";
import StatusBadge from "../components/StatusBadge";

interface AuditEntry {
  _id: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  method: string;
  path: string;
  resource: string;
  resourceId?: string | null;
  statusCode: number;
  success: boolean;
  message: string;
  summary?: string | null;
  createdAt: string;
}

interface PaginatedResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const METHODS = ["", "POST", "PUT", "PATCH", "DELETE"];

export default function AuditLogsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const [resource, setResource] = useState("");
  const [actor, setActor] = useState("");
  const [successFilter, setSuccessFilter] = useState("");
  const [error, setError] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
      });
      if (method) params.set("method", method);
      if (resource.trim()) params.set("resource", resource.trim());
      if (actor.trim()) params.set("actor", actor.trim());
      if (successFilter) params.set("success", successFilter);

      const res = await fetch(`/api/admin/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.message || "Failed to fetch audit logs");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, method, resource, actor, successFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="POST / PUT / PATCH / DELETE changes made in the admin panel"
      />

      {error && (
        <div className="mb-4 p-3 text-sm text-admin-body bg-admin-subtle border border-admin-line rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-3">
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus"
        >
          <option value="">All methods</option>
          {METHODS.filter(Boolean).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Resource (e.g. products)"
          value={resource}
          onChange={(e) => {
            setResource(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-48 px-4 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus"
        />
        <input
          type="text"
          placeholder="Actor email or role"
          value={actor}
          onChange={(e) => {
            setActor(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-56 px-4 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus"
        />
        <select
          value={successFilter}
          onChange={(e) => {
            setSuccessFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus"
        >
          <option value="">All outcomes</option>
          <option value="true">Success</option>
          <option value="false">Failed</option>
        </select>
      </div>

      <div className="bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No audit entries yet"
            description="Admin create/update/delete actions will appear here"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/50">
                    <th className="text-left font-medium text-admin-muted px-4 py-3">
                      When
                    </th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">
                      Actor
                    </th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">
                      Action
                    </th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden md:table-cell">
                      Path
                    </th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((entry) => (
                    <tr
                      key={entry._id}
                      className="hover:bg-admin-hover transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-admin-muted">
                        {new Date(entry.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-admin-heading truncate max-w-[12rem]">
                          {entry.actorEmail || entry.actorUserId}
                        </p>
                        <p className="text-xs text-admin-faint capitalize">
                          {entry.actorRole.replace(/_/g, " ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex px-1.5 py-0.5 text-[11px] font-semibold rounded bg-admin-subtle text-admin-body font-mono">
                            {entry.method}
                          </span>
                          <span className="text-admin-body">{entry.resource}</span>
                          {entry.resourceId && (
                            <span className="text-xs font-mono text-admin-faint truncate max-w-[8rem]">
                              {entry.resourceId}
                            </span>
                          )}
                        </div>
                        {entry.message && (
                          <p className="text-xs text-admin-muted mt-1 truncate max-w-xs">
                            {entry.message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs font-mono text-admin-muted break-all">
                          {entry.path}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={entry.success ? "active" : "cancelled"}
                          />
                          <span className="text-xs text-admin-faint font-mono">
                            {entry.statusCode}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-admin-line">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
