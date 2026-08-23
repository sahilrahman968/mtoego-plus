"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface HeaderProps {
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
  navigationOpen: boolean;
}

const routeLabels: Record<string, string> = {
  admin: "Dashboard",
  analytics: "Analytics",
  products: "Products",
  categories: "Categories",
  orders: "Orders",
  reviews: "Reviews",
  "callback-requests": "Customisation",
  coupons: "Coupons",
  sales: "Sales",
  staff: "Staff",
  roles: "Roles & permissions",
  "audit-logs": "Audit logs",
  new: "New",
  performance: "Performance",
};

function readableSegment(segment: string, index: number) {
  if (routeLabels[segment]) return routeLabels[segment];
  if (index > 1) return "Details";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Header({
  userName,
  userRole,
  onMenuToggle,
  navigationOpen,
}: HeaderProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => ({
      label: readableSegment(segment, index),
      href: `/${segments.slice(0, index + 1).join("/")}`,
    }));
  }, [pathname]);

  useEffect(() => {
    if (!showDropdown) return;
    logoutRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowDropdown(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.replace("/admin/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const initials = userName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-admin-line bg-admin-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-admin-muted hover:bg-admin-hover hover:text-admin-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus lg:hidden"
          aria-label="Open navigation"
          aria-controls="admin-navigation"
          aria-expanded={navigationOpen}
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1 text-sm">
            {crumbs.map((crumb, index) => {
              const current = index === crumbs.length - 1;
              return (
                <li key={`${crumb.href}-${index}`} className="flex min-w-0 items-center gap-1">
                  {index > 0 && <span className="text-admin-faint" aria-hidden="true">/</span>}
                  {current ? (
                    <span className="truncate font-medium text-admin-heading" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="hidden text-admin-muted hover:text-admin-heading sm:inline">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setShowDropdown((open) => !open)}
          className="flex min-h-10 items-center gap-2 rounded-lg p-1 pr-2 text-left hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
          aria-label={`Open account menu for ${userName}`}
          aria-expanded={showDropdown}
          aria-haspopup="menu"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-admin-subtle text-xs font-semibold text-admin-heading">
            {initials}
          </span>
          <span className="hidden max-w-36 sm:block">
            <span className="block truncate text-sm font-medium leading-tight text-admin-body">{userName}</span>
            <span className="block truncate text-xs capitalize text-admin-faint">{userRole.replace(/_/g, " ")}</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-4 text-admin-faint sm:block" />
        </button>

        {showDropdown && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-admin-line bg-admin-surface p-1.5 shadow-xl"
          >
            <div className="border-b border-admin-line px-2.5 py-2 sm:hidden">
              <p className="truncate text-sm font-medium text-admin-body">{userName}</p>
              <p className="truncate text-xs capitalize text-admin-faint">{userRole.replace(/_/g, " ")}</p>
            </div>
            <button
              ref={logoutRef}
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm text-admin-body hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus disabled:opacity-50"
            >
              <LogOut aria-hidden="true" className="size-4 text-admin-muted" />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
