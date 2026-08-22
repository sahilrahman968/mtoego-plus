"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";

interface AdminRoleOption {
  slug: string;
  name: string;
  isSystem: boolean;
}

export default function NewStaffPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<AdminRoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/roles");
        const json = await res.json();
        if (json.success) {
          const list: AdminRoleOption[] = (json.data.roles || []).map(
            (r: { slug: string; name: string; isSystem: boolean }) => ({
              slug: r.slug,
              name: r.name,
              isSystem: r.isSystem,
            })
          );
          setRoles(list);
          if (list.some((r) => r.slug === "staff")) {
            setRole("staff");
          } else if (list[0]) {
            setRole(list[0].slug);
          }
        }
      } catch {
        setError("Failed to load roles");
      } finally {
        setRolesLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/admin/staff");
      } else {
        setError(json.message || "Failed to create staff member");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Staff Member"
        description="Authorize an email for admin access. They sign in with Google."
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {error && (
          <div className="p-3 text-sm text-admin-body bg-admin-subtle border border-admin-line rounded-lg">{error}</div>
        )}

        <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-body mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
                placeholder="john@example.com"
              />
              <p className="mt-1.5 text-xs text-admin-faint">
                Name is filled in when they sign in with Google using this email.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-body mb-1.5">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={rolesLoading || roles.length === 0}
                className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface disabled:opacity-50"
              >
                {roles.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-admin-faint">
                Permissions for each role are managed under Roles &amp; Permissions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || rolesLoading || !role}
            className="px-5 py-2.5 text-sm font-medium text-white bg-admin-primary rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating..." : "Create Staff Member"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/staff")}
            className="px-5 py-2.5 text-sm font-medium text-admin-body bg-admin-surface border border-admin-line-strong rounded-lg hover:bg-admin-hover transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
