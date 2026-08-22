"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import AuthBackdrop from "@/components/jewellery/account/AuthBackdrop";
import GoogleSignInButton from "@/components/jewellery/account/GoogleSignInButton";
import { isAdminPanelRole } from "@/lib/auth/permissions";

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

  if (authLoading) return null;

  return (
    <AuthBackdrop>
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

      <div className="auth-form">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        {error && (
          <div className="p-3 mt-4 bg-danger/10 border border-danger/25 rounded-lg text-sm text-danger animate-slide-up">
            {error}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Only authorized admin accounts can access this panel.
      </p>
    </AuthBackdrop>
  );
}
