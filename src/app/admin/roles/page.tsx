"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import type { PermissionMeta } from "@/lib/auth/permissions";

interface RoleRow {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  isAdmin: boolean;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [catalog, setCatalog] = useState<PermissionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set()
  );

  const selected = useMemo(
    () => roles.find((r) => r.slug === selectedSlug) ?? null,
    [roles, selectedSlug]
  );

  const groups = useMemo(() => {
    const map = new Map<string, PermissionMeta[]>();
    for (const item of catalog) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [catalog]);

  const groupNames = useMemo(() => groups.map(([name]) => name), [groups]);

  const dirty = useMemo(() => {
    if (!selected) return false;
    const permsChanged =
      JSON.stringify([...draftPermissions].sort()) !==
      JSON.stringify([...(selected.permissions || [])].sort());
    const nameChanged = draftName.trim() !== selected.name;
    const descChanged = draftDescription.trim() !== (selected.description || "");
    return permsChanged || nameChanged || descChanged;
  }, [selected, draftPermissions, draftName, draftDescription]);

  const selectRole = useCallback((role: RoleRow) => {
    setSelectedSlug(role.slug);
    setDraftPermissions([...(role.permissions || [])]);
    setDraftName(role.name);
    setDraftDescription(role.description || "");
    setError("");
    setSuccess("");
  }, []);

  const fetchRoles = useCallback(async (preferSlug?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/roles");
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to load roles");
        return;
      }
      const nextRoles: RoleRow[] = json.data.roles || [];
      setRoles(nextRoles);
      setCatalog(json.data.catalog || []);

      const targetSlug =
        preferSlug ||
        selectedSlug ||
        nextRoles.find((r) => r.slug === "staff")?.slug ||
        nextRoles[0]?.slug ||
        null;

      const target = nextRoles.find((r) => r.slug === targetSlug) || nextRoles[0];
      if (target) {
        setSelectedSlug(target.slug);
        setDraftPermissions([...(target.permissions || [])]);
        setDraftName(target.name);
        setDraftDescription(target.description || "");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [selectedSlug]);

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePermission = (key: string) => {
    if (selected?.slug === "super_admin") return;
    setDraftPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleGroup = (keys: string[], enable: boolean) => {
    if (selected?.slug === "super_admin") return;
    setDraftPermissions((prev) => {
      const set = new Set(prev);
      for (const key of keys) {
        if (enable) set.add(key);
        else set.delete(key);
      }
      return Array.from(set);
    });
  };

  const toggleCollapsed = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const expandAll = () => setCollapsedGroups(new Set());
  const collapseAll = () => setCollapsedGroups(new Set(groupNames));

  const handleSave = async () => {
    if (!selected || selected.slug === "super_admin") return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/roles/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim(),
          description: draftDescription.trim(),
          permissions: draftPermissions,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to update role");
        return;
      }
      setSuccess("Permissions saved");
      await fetchRoles(selected.slug);
    } catch {
      setError("Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim(),
          permissions: [],
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to create role");
        return;
      }
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setSuccess("Role created — configure its ACL below");
      await fetchRoles(json.data.slug);
    } catch {
      setError("Failed to create role");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/roles/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to delete role");
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      setSuccess("Role deleted");
      await fetchRoles();
    } catch {
      setError("Failed to delete role");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const isLocked = selected?.slug === "super_admin";
  const allCollapsed =
    groupNames.length > 0 && groupNames.every((g) => collapsedGroups.has(g));

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Create roles and edit their access with the ACL table (Super Admin only)"
        action={{
          label: "New Role",
          onClick: () => {
            setShowCreate(true);
            setError("");
            setSuccess("");
          },
        }}
      />

      {error && (
        <div className="mb-4 p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
          {success}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-white rounded-xl border border-slate-200 p-5 space-y-4 max-w-xl"
        >
          <h2 className="text-sm font-semibold text-slate-900">Create role</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              minLength={2}
              placeholder="e.g. Inventory Manager"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description
            </label>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional short description"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : roles.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Create an admin role to get started"
          action={{ label: "New Role", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-700">Roles</h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {roles.map((role) => (
                <li key={role._id}>
                  <button
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      selectedSlug === role.slug
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {role.name}
                      </p>
                      {role.isSystem && (
                        <span className="text-[10px] uppercase tracking-wide text-slate-400">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {role.slug}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {role.slug === "super_admin"
                        ? "All permissions"
                        : `${role.permissions?.length || 0} permission${
                            (role.permissions?.length || 0) === 1 ? "" : "s"
                          }`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {!selected ? (
              <div className="p-8 text-sm text-slate-500">
                Select a role to edit permissions
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Display name
                        </label>
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          disabled={isLocked}
                          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Description
                        </label>
                        <input
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          disabled={isLocked}
                          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selected.isSystem && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(selected)}
                          className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !dirty || isLocked}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save ACL"}
                      </button>
                    </div>
                  </div>
                  {isLocked && (
                    <p className="text-xs text-slate-500">
                      Super Admin always has full access and cannot be edited.
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={allCollapsed ? expandAll : collapseAll}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                    >
                      {allCollapsed ? "Expand all" : "Collapse all"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="text-left font-medium text-slate-500 px-5 py-3 w-12">
                          <span className="sr-only">Allowed</span>
                        </th>
                        <th className="text-left font-medium text-slate-500 px-2 py-3">
                          Permission
                        </th>
                        <th className="text-left font-medium text-slate-500 px-5 py-3 hidden sm:table-cell">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map(([group, items]) => {
                        const keys = items.map((i) => i.key);
                        const allOn = keys.every((k) =>
                          draftPermissions.includes(k)
                        );
                        const someOn =
                          !allOn &&
                          keys.some((k) => draftPermissions.includes(k));
                        const collapsed = collapsedGroups.has(group);
                        return (
                          <AclGroup
                            key={group}
                            group={group}
                            items={items}
                            allOn={allOn}
                            someOn={someOn}
                            locked={isLocked}
                            collapsed={collapsed}
                            draftPermissions={draftPermissions}
                            onToggleGroup={toggleGroup}
                            onToggle={togglePermission}
                            onToggleCollapsed={() => toggleCollapsed(group)}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={`Delete "${deleteTarget?.name}"? Users must be reassigned first.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AclGroup({
  group,
  items,
  allOn,
  someOn,
  locked,
  collapsed,
  draftPermissions,
  onToggleGroup,
  onToggle,
  onToggleCollapsed,
}: {
  group: string;
  items: PermissionMeta[];
  allOn: boolean;
  someOn: boolean;
  locked: boolean;
  collapsed: boolean;
  draftPermissions: string[];
  onToggleGroup: (keys: string[], enable: boolean) => void;
  onToggle: (key: string) => void;
  onToggleCollapsed: () => void;
}) {
  const keys = items.map((i) => i.key);
  const enabledCount = keys.filter((k) => draftPermissions.includes(k)).length;

  return (
    <>
      <tr className="bg-slate-50/80 border-b border-slate-100">
        <td className="px-5 py-2.5">
          <input
            type="checkbox"
            checked={allOn}
            ref={(el) => {
              if (el) el.indeterminate = someOn;
            }}
            disabled={locked}
            onChange={(e) => onToggleGroup(keys, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300 text-gray-900 focus:ring-gray-400"
            aria-label={`Toggle all ${group} permissions`}
          />
        </td>
        <td colSpan={2} className="px-2 py-2.5">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex items-center gap-2 w-full text-left group"
            aria-expanded={!collapsed}
          >
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${
                collapsed ? "" : "rotate-90"
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-700">
              {group}
            </span>
            <span className="text-[11px] text-slate-400 font-normal normal-case tracking-normal">
              {enabledCount}/{keys.length}
            </span>
          </button>
        </td>
      </tr>
      {!collapsed &&
        items.map((item) => (
          <tr
            key={item.key}
            className="border-b border-slate-50 hover:bg-slate-50/40"
          >
            <td className="px-5 py-2.5">
              <input
                type="checkbox"
                checked={locked || draftPermissions.includes(item.key)}
                disabled={locked}
                onChange={() => onToggle(item.key)}
                className="rounded border-slate-300 text-gray-900 focus:ring-gray-400"
              />
            </td>
            <td className="px-2 py-2.5">
              <p className="font-medium text-slate-800">{item.label}</p>
              <p className="text-[11px] font-mono text-slate-400">{item.key}</p>
            </td>
            <td className="px-5 py-2.5 text-slate-500 hidden sm:table-cell">
              {item.description}
            </td>
          </tr>
        ))}
    </>
  );
}
