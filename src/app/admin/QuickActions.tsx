import Link from "next/link";
import {
  Boxes,
  FolderTree,
  LayoutGrid,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Ticket,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

interface QuickActionsProps {
  isSuperAdmin: boolean;
  totalProducts: number;
  totalCategories: number;
  totalCoupons: number;
  totalOrders: number;
}

interface Shortcut {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  group: "create" | "manage";
  superAdminOnly?: boolean;
}

const iconClass = "size-4 shrink-0";

const shortcuts: Shortcut[] = [
  {
    label: "Add Product",
    description: "Create a new product listing",
    href: "/admin/products/new",
    group: "create",
    icon: <Package aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Add Category",
    description: "Organize product catalog",
    href: "/admin/categories/new",
    group: "create",
    icon: <Tag aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Create Sale",
    description: "Launch a timed campaign",
    href: "/admin/sales/new",
    group: "create",
    icon: <Zap aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Add Coupon",
    description: "Create a discount code",
    href: "/admin/coupons/new",
    group: "create",
    icon: <Ticket aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Add Staff",
    description: "Invite new team member",
    href: "/admin/staff/new",
    group: "create",
    superAdminOnly: true,
    icon: <UserPlus aria-hidden="true" className={iconClass} />,
  },
  {
    label: "View Orders",
    description: "Manage customer orders",
    href: "/admin/orders",
    group: "manage",
    icon: <ShoppingBag aria-hidden="true" className={iconClass} />,
  },
  {
    label: "All Products",
    description: "Browse & edit products",
    href: "/admin/products",
    group: "manage",
    icon: <LayoutGrid aria-hidden="true" className={iconClass} />,
  },
  {
    label: "All Categories",
    description: "Manage category tree",
    href: "/admin/categories",
    group: "manage",
    icon: <FolderTree aria-hidden="true" className={iconClass} />,
  },
  {
    label: "All Coupons",
    description: "View active promotions",
    href: "/admin/coupons",
    group: "manage",
    icon: <Boxes aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Manage Staff",
    description: "Add or remove team members",
    href: "/admin/staff",
    group: "manage",
    superAdminOnly: true,
    icon: <Users aria-hidden="true" className={iconClass} />,
  },
  {
    label: "Roles & Permissions",
    description: "Create roles and edit ACL",
    href: "/admin/roles",
    group: "manage",
    superAdminOnly: true,
    icon: <ShieldCheck aria-hidden="true" className={iconClass} />,
  },
];

function ActionLink({
  shortcut,
  emphasis,
}: {
  shortcut: Shortcut;
  emphasis: boolean;
}) {
  return (
    <Link
      href={shortcut.href}
      title={shortcut.description}
      className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface ${
        emphasis
          ? "border-admin-primary/20 bg-admin-primary-soft text-admin-primary hover:bg-admin-primary hover:text-white"
          : "border-transparent text-admin-muted hover:bg-admin-hover hover:text-admin-heading"
      }`}
    >
      {emphasis ? (
        <Plus aria-hidden="true" className="size-3.5 shrink-0" />
      ) : (
        shortcut.icon
      )}
      {shortcut.label}
    </Link>
  );
}

// Shortcuts are a toolbar, not a feature grid: creates first as outlined
// buttons, then destinations as quiet links, so the row stays scannable.
export default function QuickActions({
  isSuperAdmin,
  totalProducts,
  totalCategories,
  totalCoupons,
  totalOrders,
}: QuickActionsProps) {
  const visible = shortcuts.filter((s) => !s.superAdminOnly || isSuperAdmin);
  const creates = visible.filter((s) => s.group === "create");
  const manages = visible.filter((s) => s.group === "manage");

  const counts = [
    { label: "products", value: totalProducts },
    { label: "categories", value: totalCategories },
    { label: "coupons", value: totalCoupons },
    { label: "orders", value: totalOrders },
  ];

  return (
    <section aria-labelledby="quick-actions-heading" className="space-y-3">
      <div className="flex flex-col gap-2 border-b border-admin-line pb-2 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="quick-actions-heading"
          className="text-sm font-semibold text-admin-heading"
        >
          Quick actions
        </h2>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-admin-muted">
          {counts.map((count) => (
            <li key={count.label}>
              <span className="font-medium text-admin-body tabular-nums">
                {count.value.toLocaleString("en-IN")}
              </span>{" "}
              {count.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-admin-line bg-admin-surface p-3">
        <div className="flex flex-wrap gap-2">
          {creates.map((shortcut) => (
            <ActionLink key={shortcut.href} shortcut={shortcut} emphasis />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1 border-t border-admin-line pt-2">
          {manages.map((shortcut) => (
            <ActionLink key={shortcut.href} shortcut={shortcut} emphasis={false} />
          ))}
        </div>
      </div>
    </section>
  );
}
