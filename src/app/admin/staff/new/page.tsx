"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { FormSection, SelectField, TextField } from "../../components/Fields";
import { AdminErrorState, AdminFormSkeleton } from "../../components/FeedbackState";

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
        } else {
          setError(json.message || "Failed to load roles");
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

      {rolesLoading ? (
        <AdminFormSkeleton sections={1} />
      ) : roles.length === 0 ? (
        <AdminErrorState
          title="Roles are unavailable"
          message={error || "At least one admin role is required before onboarding staff."}
          onRetry={() => window.location.reload()}
        />
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-lg border border-admin-danger-line bg-admin-danger-soft p-3 text-sm text-admin-danger"
          >
            {error}
          </div>
        )}

        <FormSection title="Staff access" description="Assign access to an existing Google account.">
          <TextField
            id="staff-email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="john@example.com"
            hint="Their name is filled in when they first sign in with Google."
          />
          <SelectField
            id="staff-role"
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={rolesLoading || roles.length === 0}
            hint="Permissions are managed under Roles & Permissions."
          >
            {roles.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </SelectField>
        </FormSection>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={loading || rolesLoading || !role}
          >
            {loading ? "Creating..." : "Create Staff Member"}
          </Button>
          <Button
            onClick={() => router.push("/admin/staff")}
            variant="secondary"
          >
            Cancel
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
