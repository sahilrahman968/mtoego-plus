import Link from "next/link";

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
  color: string;
  superAdminOnly?: boolean;
}

const shortcuts: Shortcut[] = [
  {
    label: "Add Product",
    description: "Create a new product listing",
    href: "/admin/products/new",
    color: "bg-gray-50 text-gray-900 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "Add Category",
    description: "Organize product catalog",
    href: "/admin/categories/new",
    color: "bg-gray-100 text-gray-700 ring-gray-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: "Add Coupon",
    description: "Create a discount code",
    href: "/admin/coupons/new",
    color: "bg-gray-50 text-gray-800 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    label: "View Orders",
    description: "Manage customer orders",
    href: "/admin/orders",
    color: "bg-gray-100 text-gray-600 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
      </svg>
    ),
  },
  {
    label: "All Products",
    description: "Browse & edit products",
    href: "/admin/products",
    color: "bg-gray-50 text-gray-700 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "All Categories",
    description: "Manage category tree",
    href: "/admin/categories",
    color: "bg-gray-100 text-gray-600 ring-gray-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    label: "All Coupons",
    description: "View active promotions",
    href: "/admin/coupons",
    color: "bg-gray-50 text-gray-700 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
  },
  {
    label: "Manage Staff",
    description: "Add or remove team members",
    href: "/admin/staff",
    superAdminOnly: true,
    color: "bg-gray-100 text-gray-600 ring-gray-300",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Add Staff",
    description: "Invite new team member",
    href: "/admin/staff/new",
    superAdminOnly: true,
    color: "bg-gray-50 text-gray-700 ring-gray-200",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
];

export default function QuickActions({
  isSuperAdmin,
  totalProducts,
  totalCategories,
  totalCoupons,
  totalOrders,
}: QuickActionsProps) {
  const visible = shortcuts.filter((s) => !s.superAdminOnly || isSuperAdmin);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{totalProducts} products</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>{totalCategories} categories</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>{totalCoupons} coupons</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>{totalOrders} orders</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {visible.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group flex items-center gap-3.5 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
          >
            <div className={`flex-shrink-0 p-2.5 rounded-lg ring-1 ${shortcut.color}`}>
              {shortcut.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 group-hover:text-gray-900 transition-colors">
                {shortcut.label}
              </p>
              <p className="text-xs text-slate-400 truncate">{shortcut.description}</p>
            </div>
            <svg
              className="w-4 h-4 text-slate-300 group-hover:text-gray-400 ml-auto flex-shrink-0 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
