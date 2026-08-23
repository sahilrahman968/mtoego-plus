"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import { AdminSkeleton } from "../components/FeedbackState";
import { Button } from "../components/Button";
import { TextField } from "../components/Fields";
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
        <div
          role="alert"
          className="mb-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft p-3 text-sm text-admin-danger"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-lg border border-admin-success-line bg-admin-success-soft p-3 text-sm text-admin-success"
        >
          {success}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-admin-surface rounded-xl border border-admin-line p-5 space-y-4 max-w-xl"
        >
          <h2 className="text-sm font-semibold text-admin-heading">Create role</h2>
          <TextField
              id="new-role-name"
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              minLength={2}
              placeholder="e.g. Inventory Manager"
          />
          <TextField
              id="new-role-description"
              label="Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Optional short description"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
            <Button
              onClick={() => setShowCreate(false)}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <AdminSkeleton />
      ) : roles.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Create an admin role to get started"
          action={{ label: "New Role", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
            <div className="px-4 py-3 border-b border-admin-line bg-admin-subtle/50">
              <h2 className="text-sm font-semibold text-admin-body">Roles</h2>
            </div>
            <ul className="divide-y divide-admin-line">
              {roles.map((role) => (
                <li key={role._id}>
                  <button
                    type="button"
                    onClick={() => selectRole(role)}
                    aria-pressed={selectedSlug === role.slug}
                    className={`w-full px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-admin-focus ${
                      selectedSlug === role.slug
                        ? "bg-admin-subtle"
                        : "hover:bg-admin-hover"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-admin-heading">
                        {role.name}
                      </p>
                      {role.isSystem && (
                        <span className="text-[10px] uppercase tracking-wide text-admin-faint">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-admin-faint mt-0.5 font-mono">
                      {role.slug}
                    </p>
                    <p className="text-xs text-admin-muted mt-1">
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

          <div className="lg:col-span-8 bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
            {!selected ? (
              <div className="p-8 text-sm text-admin-muted">
                Select a role to edit permissions
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-admin-line space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <label htmlFor="role-display-name" className="block text-xs font-medium text-admin-muted mb-1">
                          Display name
                        </label>
                        <input
                          id="role-display-name"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          disabled={isLocked}
                          className="w-full max-w-md px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus disabled:bg-admin-subtle disabled:text-admin-muted"
                        />
                      </div>
                      <div>
                        <label htmlFor="role-description" className="block text-xs font-medium text-admin-muted mb-1">
                          Description
                        </label>
                        <input
                          id="role-description"
                          value={draftDescription}
                          onChange={(e) => setDraftDescription(e.target.value)}
                          disabled={isLocked}
                          className="w-full max-w-md px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus disabled:bg-admin-subtle disabled:text-admin-muted"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selected.isSystem && (
                        <Button
                          onClick={() => setDeleteTarget(selected)}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      )}
                      <Button
                        onClick={handleSave}
                        disabled={saving || !dirty || isLocked}
                      >
                        {saving ? "Saving..." : "Save ACL"}
                      </Button>
                    </div>
                  </div>
                  {isLocked && (
                    <p role="status" className="text-xs text-admin-muted">
                      Super Admin always has full access and cannot be edited.
                    </p>
                  )}
                  {!isLocked && dirty && (
                    <p role="status" className="text-xs font-medium text-admin-warning">
                      Unsaved changes
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      onClick={allCollapsed ? expandAll : collapseAll}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      {allCollapsed ? "Expand all" : "Collapse all"}
                    </Button>
                  </div>
                </div>

                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-label={`${selected.name} permission matrix`}
                  tabIndex={0}
                >
                  <table className="w-full min-w-[34rem] text-sm">
                    <caption className="sr-only">
                      Permission access control list for {selected.name}
                    </caption>
                    <thead>
                      <tr className="border-b border-admin-line bg-admin-subtle/50">
                        <th className="text-left font-medium text-admin-muted px-5 py-3 w-12">
                          <span className="sr-only">Allowed</span>
                        </th>
                        <th className="text-left font-medium text-admin-muted px-2 py-3">
                          Permission
                        </th>
                        <th className="text-left font-medium text-admin-muted px-5 py-3 hidden sm:table-cell">
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
      <tr className="bg-admin-subtle/80 border-b border-admin-line">
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
            className="rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
            aria-label={`Toggle all ${group} permissions`}
          />
        </td>
        <td colSpan={2} className="px-2 py-2.5">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="group flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
            aria-expanded={!collapsed}
          >
            <svg
              className={`w-4 h-4 text-admin-faint transition-transform ${
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
            <span className="text-xs font-semibold uppercase tracking-wide text-admin-muted group-hover:text-admin-body">
              {group}
            </span>
            <span className="text-[11px] text-admin-faint font-normal normal-case tracking-normal">
              {enabledCount}/{keys.length}
            </span>
          </button>
        </td>
      </tr>
      {!collapsed &&
        items.map((item) => (
          <tr
            key={item.key}
            className="border-b border-admin-line hover:bg-admin-hover"
          >
            <td className="px-5 py-2.5">
              <input
                type="checkbox"
                aria-label={`${item.label}: ${item.description}`}
                checked={locked || draftPermissions.includes(item.key)}
                disabled={locked}
                onChange={() => onToggle(item.key)}
                className="rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
              />
            </td>
            <td className="px-2 py-2.5">
              <p className="font-medium text-admin-body">{item.label}</p>
              <p className="text-[11px] font-mono text-admin-faint">{item.key}</p>
            </td>
            <td className="px-5 py-2.5 text-admin-muted hidden sm:table-cell">
              {item.description}
            </td>
          </tr>
        ))}
    </>
  );
}
