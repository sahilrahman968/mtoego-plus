import Role from "@/models/role.model";
import {
  PERMISSIONS,
  STAFF_DEFAULT_PERMISSIONS,
  Permission,
  isAdminPanelRole,
  expandPermissions,
} from "@/lib/auth/permissions";

export { isAdminPanelRole };

export const SYSTEM_ROLE_SLUGS = ["super_admin", "staff", "customer"] as const;
export type SystemRoleSlug = (typeof SYSTEM_ROLE_SLUGS)[number];

const SYSTEM_ROLE_DEFS: Array<{
  slug: SystemRoleSlug;
  name: string;
  description: string;
  permissions: Permission[];
  isAdmin: boolean;
}> = [
  {
    slug: "super_admin",
    name: "Super Admin",
    description: "Full access to the admin panel, staff, and roles",
    permissions: [...PERMISSIONS],
    isAdmin: true,
  },
  {
    slug: "staff",
    name: "Staff",
    description: "Standard store operations access",
    permissions: [...STAFF_DEFAULT_PERMISSIONS],
    isAdmin: true,
  },
  {
    slug: "customer",
    name: "Customer",
    description: "Storefront customer (no admin access)",
    permissions: [],
    isAdmin: false,
  },
];

let ensurePromise: Promise<void> | null = null;

function samePermissionSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/** Idempotently seed the three system roles. Safe to call on every request. */
export async function ensureSystemRoles(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await Promise.all(
        SYSTEM_ROLE_DEFS.map(async (def) => {
          const existing = await Role.findOne({ slug: def.slug });
          if (existing) {
            let dirty = false;
            if (!existing.isSystem) {
              existing.isSystem = true;
              dirty = true;
            }
            if (existing.isAdmin !== def.isAdmin) {
              existing.isAdmin = def.isAdmin;
              dirty = true;
            }
            if (def.slug === "super_admin") {
              if (!samePermissionSet(existing.permissions, [...PERMISSIONS])) {
                existing.permissions = [...PERMISSIONS];
                dirty = true;
              }
            } else if (def.slug === "customer") {
              if (existing.permissions.length > 0) {
                existing.permissions = [];
                dirty = true;
              }
            } else if (def.slug === "staff") {
              const next =
                existing.permissions.length === 0
                  ? [...STAFF_DEFAULT_PERMISSIONS]
                  : expandPermissions(existing.permissions);
              if (!samePermissionSet(existing.permissions, next)) {
                existing.permissions = next;
                dirty = true;
              }
            }
            if (dirty) await existing.save();
            return;
          }

          await Role.create({
            ...def,
            isSystem: true,
          });
        })
      );
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  await ensurePromise;
}

export function isSystemRoleSlug(slug: string): slug is SystemRoleSlug {
  return (SYSTEM_ROLE_SLUGS as readonly string[]).includes(slug);
}

export async function getRoleBySlug(slug: string) {
  await ensureSystemRoles();
  return Role.findOne({ slug: slug.toLowerCase() }).lean();
}

export async function getPermissionsForRole(
  roleSlug: string
): Promise<string[]> {
  if (roleSlug === "super_admin") return ["*"];
  const role = await getRoleBySlug(roleSlug);
  if (!role || !role.isAdmin) return [];
  return expandPermissions(role.permissions ?? []);
}

export async function listAdminRoles() {
  await ensureSystemRoles();
  const roles = await Role.find({ isAdmin: true })
    .sort({ isSystem: -1, name: 1 })
    .lean();
  return roles.map((role) => ({
    ...role,
    permissions: expandPermissions(role.permissions ?? []),
  }));
}

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .slice(0, 32);
}
