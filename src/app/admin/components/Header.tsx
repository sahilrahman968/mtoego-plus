"use client";

import { useState } from "react";

interface HeaderProps {
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
}

export default function Header({ userName, userRole, onMenuToggle }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Full page load: a client-side push would keep this authenticated
      // /admin layout wrapped around the login page, and would also serve the
      // signed-in pages from the router cache after the cookie is gone.
      window.location.replace("/admin/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-admin-surface border-b border-admin-line">
      {/* Left: Mobile menu + breadcrumb area */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-admin-hover lg:hidden"
        >
          <svg className="w-5 h-5 text-admin-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-admin-hover transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-admin-subtle text-admin-heading text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-admin-body leading-tight">{userName}</p>
            <p className="text-xs text-admin-faint capitalize">{userRole.replace("_", " ")}</p>
          </div>
          <svg className="w-4 h-4 text-admin-faint hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 py-1 bg-admin-surface rounded-lg shadow-lg border border-admin-line">
              <div className="px-4 py-2 border-b border-admin-line sm:hidden">
                <p className="text-sm font-medium text-admin-body">{userName}</p>
                <p className="text-xs text-admin-faint capitalize">{userRole.replace("_", " ")}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full px-4 py-2 text-left text-sm text-admin-body hover:bg-admin-hover transition-colors disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Sign out"}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
