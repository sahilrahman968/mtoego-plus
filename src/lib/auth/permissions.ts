// ─── Admin permission catalog ───────────────────────────────────────────────
// Fine-grained capabilities granted via the ACL table.
// Super-admin bypasses these checks. Staff/roles management stays super-admin only.

export const PERMISSIONS = [
  // Dashboard
  "dashboard.read",

  // Analytics (per report)
  "analytics.pulse",
  "analytics.curves",
  "analytics.customers",
  "analytics.merchandising",
  "analytics.trust",

  // Products
  "products.list",
  "products.view",
  "products.create",
  "products.update",
  "products.delete",
  "products.inventory.read",
  "products.inventory.write",

  // Categories
  "categories.list",
  "categories.view",
  "categories.create",
  "categories.update",
  "categories.delete",

  // Orders
  "orders.list",
  "orders.view",
  "orders.update_status",

  // Reviews
  "reviews.list",
  "reviews.moderate",
  "reviews.delete",

  // Coupons
  "coupons.list",
  "coupons.view",
  "coupons.create",
  "coupons.update",
  "coupons.delete",

  // Customisation requests
  "callback_requests.list",
  "callback_requests.update",

  // Media
  "media.upload",
  "media.rename",
  "media.delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionMeta {
  key: Permission;
  label: string;
  description: string;
  group: string;
}

export const PERMISSION_CATALOG: PermissionMeta[] = [
  {
    key: "dashboard.read",
    label: "View dashboard",
    description: "Access the admin dashboard overview and stats",
    group: "Dashboard",
  },

  {
    key: "analytics.pulse",
    label: "Pulse metrics",
    description: "Live store pulse / KPI summary",
    group: "Analytics",
  },
  {
    key: "analytics.curves",
    label: "Revenue curves",
    description: "Revenue and order trend charts",
    group: "Analytics",
  },
  {
    key: "analytics.customers",
    label: "Customer analytics",
    description: "Customer growth and behaviour reports",
    group: "Analytics",
  },
  {
    key: "analytics.merchandising",
    label: "Merchandising analytics",
    description: "Product and category performance",
    group: "Analytics",
  },
  {
    key: "analytics.trust",
    label: "Trust analytics",
    description: "Reviews and trust signals",
    group: "Analytics",
  },

  {
    key: "products.list",
    label: "List products",
    description: "Browse the product catalog list",
    group: "Products",
  },
  {
    key: "products.view",
    label: "View product details",
    description: "Open a single product’s admin detail",
    group: "Products",
  },
  {
    key: "products.create",
    label: "Create products",
    description: "Add new products to the catalog",
    group: "Products",
  },
  {
    key: "products.update",
    label: "Update products",
    description: "Edit existing product details",
    group: "Products",
  },
  {
    key: "products.delete",
    label: "Delete products",
    description: "Permanently remove products",
    group: "Products",
  },
  {
    key: "products.inventory.read",
    label: "View inventory",
    description: "See stock levels for variants",
    group: "Products",
  },
  {
    key: "products.inventory.write",
    label: "Update inventory",
    description: "Adjust or set stock levels",
    group: "Products",
  },

  {
    key: "categories.list",
    label: "List categories",
    description: "Browse the category tree",
    group: "Categories",
  },
  {
    key: "categories.view",
    label: "View category details",
    description: "Open a single category’s admin detail",
    group: "Categories",
  },
  {
    key: "categories.create",
    label: "Create categories",
    description: "Add new categories",
    group: "Categories",
  },
  {
    key: "categories.update",
    label: "Update categories",
    description: "Edit existing categories",
    group: "Categories",
  },
  {
    key: "categories.delete",
    label: "Delete categories",
    description: "Permanently remove categories",
    group: "Categories",
  },

  {
    key: "orders.list",
    label: "List orders",
    description: "Browse customer orders",
    group: "Orders",
  },
  {
    key: "orders.view",
    label: "View order details",
    description: "Open a single order’s detail page",
    group: "Orders",
  },
  {
    key: "orders.update_status",
    label: "Update order status",
    description: "Change status, tracking, and notes",
    group: "Orders",
  },

  {
    key: "reviews.list",
    label: "List reviews",
    description: "Browse product reviews",
    group: "Reviews",
  },
  {
    key: "reviews.moderate",
    label: "Moderate reviews",
    description: "Approve or reject reviews",
    group: "Reviews",
  },
  {
    key: "reviews.delete",
    label: "Delete reviews",
    description: "Permanently remove reviews",
    group: "Reviews",
  },

  {
    key: "coupons.list",
    label: "List coupons",
    description: "Browse discount codes",
    group: "Coupons",
  },
  {
    key: "coupons.view",
    label: "View coupon details",
    description: "Open a single coupon’s admin detail",
    group: "Coupons",
  },
  {
    key: "coupons.create",
    label: "Create coupons",
    description: "Add new discount codes",
    group: "Coupons",
  },
  {
    key: "coupons.update",
    label: "Update coupons",
    description: "Edit existing coupons",
    group: "Coupons",
  },
  {
    key: "coupons.delete",
    label: "Delete coupons",
    description: "Permanently remove coupons",
    group: "Coupons",
  },

  {
    key: "callback_requests.list",
    label: "List requests",
    description: "Browse customisation requests",
    group: "Customisation",
  },
  {
    key: "callback_requests.update",
    label: "Update requests",
    description: "Change customisation request status",
    group: "Customisation",
  },

  {
    key: "media.upload",
    label: "Upload media",
    description: "Upload images to Cloudinary",
    group: "Media",
  },
  {
    key: "media.rename",
    label: "Rename media",
    description: "Rename uploaded image assets",
    group: "Media",
  },
  {
    key: "media.delete",
    label: "Delete media",
    description: "Remove uploaded image assets",
    group: "Media",
  },
];

/** Expand coarse legacy permission keys into the fine-grained set. */
export const LEGACY_PERMISSION_MAP: Record<string, Permission[]> = {
  "analytics.read": [
    "analytics.pulse",
    "analytics.curves",
    "analytics.customers",
    "analytics.merchandising",
    "analytics.trust",
  ],
  "products.read": [
    "products.list",
    "products.view",
    "products.inventory.read",
  ],
  "products.write": [
    "products.create",
    "products.update",
    "products.inventory.write",
  ],
  "categories.read": ["categories.list", "categories.view"],
  "categories.write": ["categories.create", "categories.update"],
  "orders.read": ["orders.list", "orders.view"],
  "orders.write": ["orders.update_status"],
  "reviews.read": ["reviews.list"],
  "reviews.write": ["reviews.moderate"],
  "coupons.read": ["coupons.list", "coupons.view"],
  "coupons.write": ["coupons.create", "coupons.update"],
  "callback_requests.read": ["callback_requests.list"],
  "callback_requests.write": ["callback_requests.update"],
  "upload.write": ["media.upload", "media.rename", "media.delete"],
};

/** Default permissions for the built-in staff role. */
export const STAFF_DEFAULT_PERMISSIONS: Permission[] = PERMISSIONS.filter(
  (p) => p !== "reviews.delete"
);

export const ANALYTICS_PERMISSIONS: Permission[] = [
  "analytics.pulse",
  "analytics.curves",
  "analytics.customers",
  "analytics.merchandising",
  "analytics.trust",
];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** Normalize stored permissions: keep valid keys and expand legacy ones. */
export function expandPermissions(values: unknown): Permission[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<Permission>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    if (isPermission(value)) {
      unique.add(value);
      continue;
    }
    const expanded = LEGACY_PERMISSION_MAP[value];
    if (expanded) {
      for (const p of expanded) unique.add(p);
    }
  }
  return Array.from(unique);
}

export function sanitizePermissions(values: unknown): Permission[] {
  return expandPermissions(values);
}

export function hasPermission(
  granted: readonly string[],
  required: Permission | Permission[]
): boolean {
  if (granted.includes("*")) return true;
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((p) => granted.includes(p));
}

export function hasAnyPermission(
  granted: readonly string[],
  required: readonly Permission[]
): boolean {
  if (granted.includes("*")) return true;
  return required.some((p) => granted.includes(p));
}

/** Nav href → permission(s) required to see the link. */
export const NAV_PERMISSIONS: Record<string, Permission | Permission[]> = {
  "/admin": "dashboard.read",
  "/admin/analytics": ANALYTICS_PERMISSIONS,
  "/admin/products": "products.list",
  "/admin/categories": "categories.list",
  "/admin/orders": "orders.list",
  "/admin/reviews": "reviews.list",
  "/admin/callback-requests": "callback_requests.list",
  "/admin/coupons": "coupons.list",
};

/** Any role other than customer can access the admin panel (subject to ACL). */
export function isAdminPanelRole(roleSlug: string): boolean {
  return Boolean(roleSlug) && roleSlug !== "customer";
}
