"use client";

import { useState } from "react";
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

  return (
    <div className="admin-theme flex h-screen overflow-hidden bg-admin-canvas">
      <Sidebar
        userRole={userRole}
        permissions={permissions}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          userName={userName}
          userRole={userRole}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
