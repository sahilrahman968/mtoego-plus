"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
}

export default function Header({ userName, userRole, onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-slate-200">
      {/* Left: Mobile menu + breadcrumb area */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right: User menu */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-900 text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-700 leading-tight">{userName}</p>
            <p className="text-xs text-slate-400 capitalize">{userRole.replace("_", " ")}</p>
          </div>
          <svg className="w-4 h-4 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 py-1 bg-white rounded-lg shadow-lg border border-slate-200">
              <div className="px-4 py-2 border-b border-slate-100 sm:hidden">
                <p className="text-sm font-medium text-slate-700">{userName}</p>
                <p className="text-xs text-slate-400 capitalize">{userRole.replace("_", " ")}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
