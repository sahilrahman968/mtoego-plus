"use client";

import { useState } from "react";
import Image from "next/image";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.success) {
        const user = json.data?.user ?? json.data;
        if (user.role === "super_admin" || user.role === "staff") {
          // Full page load: /admin/login shares the /admin layout, and a client-side
          // push would reuse the cached sidebar-less version rendered for the login page.
          window.location.replace("/admin");
          return;
        }
        setError("You do not have admin access");
      } else {
        setError(json.message || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-4 h-10 w-[11.25rem] overflow-hidden">
            <Image
              src="/logo.svg"
              alt="Motoego"
              fill
              sizes="180px"
              className="object-contain object-left"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted mt-1">Sign in to manage your store</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form bg-card rounded-xl border border-border p-6 shadow-lg shadow-black/40">
          {error && (
            <div className="mb-4 p-3 text-sm text-danger bg-primary-light border border-danger/30 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Only authorized admin and staff accounts can access this panel.
        </p>
      </div>
    </div>
  );
}
