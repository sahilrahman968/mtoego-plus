"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  hasPermission,
  hasAnyPermission,
  NAV_PERMISSIONS,
  Permission,
} from "@/lib/auth/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  superAdminOnly?: boolean;
  permission?: Permission | Permission[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    permission: NAV_PERMISSIONS["/admin"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    permission: NAV_PERMISSIONS["/admin/analytics"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: "Products",
    href: "/admin/products",
    permission: NAV_PERMISSIONS["/admin/products"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: "Categories",
    href: "/admin/categories",
    permission: NAV_PERMISSIONS["/admin/categories"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: "Orders",
    href: "/admin/orders",
    permission: NAV_PERMISSIONS["/admin/orders"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01m-.01 4h.01" />
      </svg>
    ),
  },
  {
    label: "Reviews",
    href: "/admin/reviews",
    permission: NAV_PERMISSIONS["/admin/reviews"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.067 3.287a1 1 0 00.95.69h3.456c.969 0 1.371 1.24.588 1.81l-2.796 2.031a1 1 0 00-.364 1.118l1.068 3.287c.3.922-.755 1.688-1.54 1.118l-2.796-2.031a1 1 0 00-1.176 0l-2.796 2.03c-.784.57-1.838-.195-1.539-1.117l1.068-3.287a1 1 0 00-.364-1.118L2.98 8.714c-.783-.57-.38-1.81.588-1.81h3.456a1 1 0 00.95-.69l1.067-3.287z" />
      </svg>
    ),
  },
  {
    label: "Customisation Requests",
    href: "/admin/callback-requests",
    permission: NAV_PERMISSIONS["/admin/callback-requests"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h8m-8 4h5m-5 8h8a2 2 0 002-2V8l-6-6H8a2 2 0 00-2 2v16a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Coupons",
    href: "/admin/coupons",
    permission: NAV_PERMISSIONS["/admin/coupons"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
  {
    label: "Sales",
    href: "/admin/sales",
    permission: NAV_PERMISSIONS["/admin/sales"],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: "Staff",
    href: "/admin/staff",
    superAdminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Roles & Permissions",
    href: "/admin/roles",
    superAdminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    label: "Audit Logs",
    href: "/admin/audit-logs",
    superAdminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  userRole: string;
  permissions: string[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  userRole,
  permissions,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === "super_admin";

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const filteredNav = navItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return hasAnyPermission(permissions, item.permission);
    }
    return hasPermission(permissions, item.permission);
  });

  const roleLabel = userRole.replace(/_/g, " ");

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-admin-heading/25 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-admin-surface border-r border-admin-line shadow-xl transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-admin-line">
          <Link href="/admin" onClick={onClose} aria-label="Motoego Admin">
            <span className="relative block h-9 w-[9.75rem] overflow-hidden">
              <Image
                src="/logo.svg"
                alt="Motoego"
                fill
                sizes="156px"
                className="object-contain object-left"
                priority
              />
            </span>
            <span className="block text-xs text-admin-muted">Admin Panel</span>
          </Link>
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1 rounded text-admin-muted hover:bg-admin-hover hover:text-admin-heading"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.href)
                  ? "bg-admin-subtle font-semibold text-admin-heading before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-admin-primary"
                  : "font-medium text-admin-muted hover:bg-admin-hover hover:text-admin-heading"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-admin-line">
          <p className="text-xs text-admin-faint text-center capitalize">
            {roleLabel} Access
          </p>
        </div>
      </aside>
    </>
  );
}
