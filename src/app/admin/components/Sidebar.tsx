"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ComponentType } from "react";
import {
  BarChart3,
  ClipboardList,
  Gauge,
  History,
  KeyRound,
  MessageSquareText,
  Package,
  Percent,
  ShieldCheck,
  ShoppingBag,
  Star,
  Tags,
  Users,
  X,
} from "lucide-react";
import {
  hasAnyPermission,
  hasPermission,
  NAV_PERMISSIONS,
  type Permission,
} from "@/lib/auth/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  group: "Overview" | "Commerce" | "Engagement" | "Access";
  superAdminOnly?: boolean;
  permission?: Permission | Permission[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", permission: NAV_PERMISSIONS["/admin"], icon: Gauge, group: "Overview" },
  { label: "Analytics", href: "/admin/analytics", permission: NAV_PERMISSIONS["/admin/analytics"], icon: BarChart3, group: "Overview" },
  { label: "Products", href: "/admin/products", permission: NAV_PERMISSIONS["/admin/products"], icon: Package, group: "Commerce" },
  { label: "Categories", href: "/admin/categories", permission: NAV_PERMISSIONS["/admin/categories"], icon: Tags, group: "Commerce" },
  { label: "Orders", href: "/admin/orders", permission: NAV_PERMISSIONS["/admin/orders"], icon: ShoppingBag, group: "Commerce" },
  { label: "Reviews", href: "/admin/reviews", permission: NAV_PERMISSIONS["/admin/reviews"], icon: Star, group: "Engagement" },
  { label: "Customisation", href: "/admin/callback-requests", permission: NAV_PERMISSIONS["/admin/callback-requests"], icon: MessageSquareText, group: "Engagement" },
  { label: "Coupons", href: "/admin/coupons", permission: NAV_PERMISSIONS["/admin/coupons"], icon: Percent, group: "Engagement" },
  { label: "Sales", href: "/admin/sales", permission: NAV_PERMISSIONS["/admin/sales"], icon: ClipboardList, group: "Engagement" },
  { label: "Staff", href: "/admin/staff", superAdminOnly: true, icon: Users, group: "Access" },
  { label: "Roles & permissions", href: "/admin/roles", superAdminOnly: true, icon: KeyRound, group: "Access" },
  { label: "Audit logs", href: "/admin/audit-logs", superAdminOnly: true, icon: History, group: "Access" },
];

const groups: NavItem["group"][] = ["Overview", "Commerce", "Engagement", "Access"];

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
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = priorOverflow;
      previouslyFocused.current?.focus();
    };
  }, [isOpen, onClose]);

  const filteredNav = navItems.filter((item) => {
    if (item.superAdminOnly) return isSuperAdmin;
    if (isSuperAdmin) return true;
    if (!item.permission) return true;
    return Array.isArray(item.permission)
      ? hasAnyPermission(permissions, item.permission)
      : hasPermission(permissions, item.permission);
  });

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-admin-heading/35 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
          tabIndex={-1}
        />
      )}
      <aside
        ref={drawerRef}
        id="admin-navigation"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-admin-line bg-admin-surface shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center border-b border-admin-line px-4">
          <Link href="/admin" onClick={onClose} className="min-w-0" aria-label="Motoego admin dashboard">
            <span className="relative block h-7 w-32 overflow-hidden">
              <Image src="/logo.svg" alt="Motoego" fill sizes="128px" className="object-contain object-left" priority />
            </span>
            <span className="mt-0.5 block text-[11px] font-medium text-admin-muted">Administration</span>
          </Link>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="ml-auto flex size-10 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover hover:text-admin-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus lg:hidden"
            aria-label="Close navigation"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <nav className="admin-scroll flex-1 overflow-y-auto overscroll-y-contain px-3 py-4">
          {groups.map((group) => {
            const items = filteredNav.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div key={group} className="mb-5 last:mb-0">
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-admin-faint">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-9 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus ${
                          active
                            ? "bg-admin-primary font-medium text-white"
                            : "font-medium text-admin-muted hover:bg-admin-hover hover:text-admin-heading"
                        }`}
                      >
                        <Icon aria-hidden={true} className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-admin-line px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-admin-muted">
            <ShieldCheck aria-hidden="true" className="size-4 text-admin-faint" />
            <span className="truncate capitalize">{userRole.replace(/_/g, " ")} access</span>
          </div>
        </div>
      </aside>
    </>
  );
}
