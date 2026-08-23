"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const html = document.documentElement;
    const priorHtmlOverflow = html.style.overflow;
    const priorHtmlOverscroll = html.style.overscrollBehavior;
    const priorBodyOverflow = document.body.style.overflow;
    const priorBodyOverscroll = document.body.style.overscrollBehavior;

    html.classList.add("admin-panel");
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      html.classList.remove("admin-panel");
      html.style.overflow = priorHtmlOverflow;
      html.style.overscrollBehavior = priorHtmlOverscroll;
      document.body.style.overflow = priorBodyOverflow;
      document.body.style.overscrollBehavior = priorBodyOverscroll;
    };
  }, []);

  return (
    <div className="admin-theme flex h-dvh overflow-hidden bg-admin-canvas">
      <a
        href="#admin-main"
        className="fixed left-3 top-3 z-[60] -translate-y-20 rounded-lg bg-admin-primary px-3 py-2 text-sm font-medium text-white focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar
        userRole={userRole}
        permissions={permissions}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          userRole={userRole}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
          navigationOpen={sidebarOpen}
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
