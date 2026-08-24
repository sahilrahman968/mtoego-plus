"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthBackdrop from "@/components/store/AuthBackdrop";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";
import { isAdminPanelRole } from "@/lib/auth/permissions";
import { getAdminThemeCSSVariables } from "@/config/theme";

const adminThemeVars = getAdminThemeCSSVariables();

export default function AdminLoginPage() {
  const { user, isLoading: authLoading, googleSignIn } = useAuth();
  const [error, setError] = useState("");

  const goToAdmin = useCallback(() => {
    window.location.replace("/admin");
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdminPanelRole(user.role)) {
      goToAdmin();
    }
  }, [authLoading, user, goToAdmin]);

  const handleGoogleSuccess = useCallback(
    async (credential: string) => {
      setError("");
      const res = await googleSignIn(credential);

      if (!res.success) {
        setError(res.message);
        return;
      }
      if (!res.user || !isAdminPanelRole(res.user.role)) {
        setError("You do not have admin access");
        return;
      }
      goToAdmin();
    },
    [googleSignIn, goToAdmin]
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (authLoading) {
    return (
      <div
        className="admin-theme flex min-h-screen items-center justify-center bg-admin-canvas text-sm text-admin-muted"
        style={adminThemeVars as React.CSSProperties}
        role="status"
        aria-live="polite"
      >
        Checking admin session…
      </div>
    );
  }

  return (
    <AuthBackdrop>
      <main
        className="admin-theme rounded-2xl border border-admin-line bg-admin-surface p-6 shadow-2xl shadow-admin-heading/10 sm:p-8"
        style={adminThemeVars as React.CSSProperties}
      >
        <div className="mb-7 text-center">
          <div className="relative mx-auto mb-5 h-9 w-[10rem] overflow-hidden">
            <Image
              src="/logo.svg"
              alt="Motoego"
              fill
              sizes="160px"
              className="object-contain"
              priority
            />
          </div>
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-admin-line bg-admin-primary-soft text-admin-primary">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-admin-heading">
            Admin sign in
          </h1>
          <p className="mt-1.5 text-sm text-admin-muted">
            Continue with your authorized Google account.
          </p>
        </div>

        <div>
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-4 rounded-lg border border-admin-danger-line bg-admin-danger-soft p-3 text-sm text-admin-danger"
            >
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2 border-t border-admin-line pt-5 text-xs text-admin-muted">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-admin-faint" />
          <p>Access is restricted to approved admin accounts and recorded for security.</p>
        </div>
      </main>
    </AuthBackdrop>
  );
}
