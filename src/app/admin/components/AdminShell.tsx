"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getAdminThemeCSSVariables } from "@/config/theme";

const adminThemeVars = getAdminThemeCSSVariables();
const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";

interface AdminShellProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
  permissions: string[];
}

export default function AdminShell({
  children,
  userName,
  userRole,
  permissions,
}: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // private mode / blocked storage — keep default expanded
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const priorHtmlOverflow = html.style.overflow;
    const priorHtmlOverscroll = html.style.overscrollBehavior;
    const priorBodyOverflow = document.body.style.overflow;
    const priorBodyOverscroll = document.body.style.overscrollBehavior;
    const appliedVars = Object.keys(adminThemeVars);

    html.classList.add("admin-panel");
    for (const [key, value] of Object.entries(adminThemeVars)) {
      html.style.setProperty(key, value);
    }
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      html.classList.remove("admin-panel");
      for (const key of appliedVars) {
        html.style.removeProperty(key);
      }
      html.style.overflow = priorHtmlOverflow;
      html.style.overscrollBehavior = priorHtmlOverscroll;
      document.body.style.overflow = priorBodyOverflow;
      document.body.style.overscrollBehavior = priorBodyOverscroll;
    };
  }, []);

  return (
    <div
      className="admin-theme flex h-dvh overflow-hidden bg-admin-canvas"
      style={adminThemeVars as React.CSSProperties}
    >
      <a
        href="#admin-main"
        className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-admin-primary px-3 py-2 text-sm font-medium text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar
        userRole={userRole}
        permissions={permissions}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
        collapsed={collapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          userRole={userRole}
          onMobileMenuToggle={() => setMobileOpen((open) => !open)}
          mobileNavigationOpen={mobileOpen}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />

        <main
          id="admin-main"
          tabIndex={-1}
          className="admin-scroll flex-1 overflow-y-auto overscroll-y-contain outline-none"
        >
          <div className="mx-auto max-w-[90rem] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
