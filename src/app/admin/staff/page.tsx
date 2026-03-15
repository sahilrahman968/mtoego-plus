"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: StaffMember[];
  total: number;
  page: number;
  totalPages: number;
}

export default function StaffPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/staff?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/staff/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchStaff();
      }
    } catch (err) {
      console.error("Failed to delete staff:", err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    setToggling(member._id);
    try {
      const res = await fetch(`/api/admin/staff/${member._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const json = await res.json();
      if (json.success) fetchStaff();
    } catch (err) {
      console.error("Failed to toggle staff status:", err);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Manage admin and staff accounts (Super Admin only)"
        action={{ label: "Add Staff", href: "/admin/staff/new" }}
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-80 px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No staff members found"
            description={search ? "Try a different search term" : "Add staff members to help manage your store"}
            action={!search ? { label: "Add Staff", href: "/admin/staff/new" } : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Name</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden sm:table-cell">Email</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Role</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3">Status</th>
                    <th className="text-left font-medium text-slate-500 px-4 py-3 hidden md:table-cell">Joined</th>
                    <th className="text-right font-medium text-slate-500 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((member) => (
                    <tr key={member._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-900 text-xs font-semibold flex-shrink-0">
                            {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{member.name}</p>
                            <p className="text-xs text-slate-400 sm:hidden truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-slate-600">{member.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-slate-500">
                          {new Date(member.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleActive(member)}
                            disabled={toggling === member._id}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(member)}
                            className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Staff Member"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
