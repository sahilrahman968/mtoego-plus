"use client";

import { useEffect, useState, useCallback } from "react";
import { Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button } from "../components/Button";

interface StaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminRoleOption {
  slug: string;
  name: string;
  isSystem: boolean;
}

interface PaginatedResponse {
  items: StaffMember[];
  roles: AdminRoleOption[];
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
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/staff?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else setError(json.message || "Failed to fetch staff");
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setError("Failed to fetch staff");
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
      } else {
        setError(json.message || "Failed to delete staff member");
      }
    } catch (err) {
      console.error("Failed to delete staff:", err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (member: StaffMember) => {
    setToggling(member._id);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/${member._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const json = await res.json();
      if (json.success) fetchStaff();
      else setError(json.message || "Failed to update status");
    } catch (err) {
      console.error("Failed to toggle staff status:", err);
    } finally {
      setToggling(null);
    }
  };

  const changeRole = async (member: StaffMember, role: string) => {
    if (role === member.role) return;
    setUpdatingRole(member._id);
    setError("");
    try {
      const res = await fetch(`/api/admin/staff/${member._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (json.success) fetchStaff();
      else {
        setError(json.message || "Failed to update role");
        fetchStaff();
      }
    } catch (err) {
      console.error("Failed to update role:", err);
      setError("Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  const roleLabel = (slug: string) =>
    data?.roles.find((r) => r.slug === slug)?.name || slug.replace(/_/g, " ");

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description="Manage admin panel users and their roles (Super Admin only)"
        action={{ label: "Add Staff", href: "/admin/staff/new" }}
      />

      {error && data && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft p-3 text-sm text-admin-danger"
        >
          {error}
        </div>
      )}

      <SearchFilterBar
        id="staff-search"
        label="Search staff"
        placeholder="Search by name or email…"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      />

      {error && !data && !loading ? (
        <AdminErrorState
          title="Unable to load staff"
          message={error}
          onRetry={fetchStaff}
        />
      ) : (
      <DataTableShell
        label="Staff members"
        footer={
          data && data.totalPages > 1 ? (
            <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
          ) : undefined
        }
      >
        {loading ? (
          <AdminTableSkeleton rows={8} columns={6} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No staff members found"
            description={search ? "Try a different search term" : "Add staff members to help manage your store"}
            action={!search ? { label: "Add Staff", href: "/admin/staff/new" } : undefined}
          />
        ) : (
          <>
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/50">
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Name</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden sm:table-cell">Email</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Role</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Status</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden md:table-cell">Joined</th>
                    <th className="text-right font-medium text-admin-muted px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((member) => (
                    <tr key={member._id} className="hover:bg-admin-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-admin-subtle text-admin-heading text-xs font-semibold flex-shrink-0">
                            {member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-admin-heading truncate">{member.name}</p>
                            <p className="text-xs text-admin-faint sm:hidden truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-admin-muted">{member.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Role for ${member.name}`}
                          value={member.role}
                          disabled={updatingRole === member._id}
                          onChange={(e) => changeRole(member, e.target.value)}
                          className="min-h-9 max-w-[11rem] rounded-md border border-admin-line-strong bg-admin-surface px-2 py-1.5 text-xs outline-none focus:border-admin-primary focus:ring-2 focus:ring-admin-focus/50 disabled:opacity-50"
                          title={roleLabel(member.role)}
                        >
                          {data.roles.map((role) => (
                            <option key={role.slug} value={role.slug}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-admin-muted">
                          {new Date(member.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => toggleActive(member)}
                            disabled={toggling === member._id}
                            variant="ghost"
                            size="sm"
                            className="px-2 text-xs"
                            aria-label={`${member.isActive ? "Deactivate" : "Activate"} ${member.name}`}
                            icon={member.isActive
                              ? <UserRoundX aria-hidden="true" className="size-3.5" />
                              : <UserRoundCheck aria-hidden="true" className="size-3.5" />}
                          >
                            {member.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            onClick={() => setDeleteTarget(member)}
                            variant="ghost"
                            size="sm"
                            className="px-2 text-xs"
                            aria-label={`Delete ${member.name}`}
                            icon={<Trash2 aria-hidden="true" className="size-3.5" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </>
        )}
      </DataTableShell>
      )}

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
