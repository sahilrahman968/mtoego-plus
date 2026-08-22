"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/jewellery/shared/Toast";
import AuthBackdrop from "@/components/jewellery/account/AuthBackdrop";
import GoogleSignInButton from "@/components/jewellery/account/GoogleSignInButton";
import { theme } from "@/config/theme";

export default function AuthShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { googleSignIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  const handleGoogleSuccess = useCallback(
    async (credential: string) => {
      setError("");
      const res = await googleSignIn(credential);
      if (res.success) {
        toast("Welcome!", "success");
        router.replace(redirect);
      } else {
        setError(res.message);
      }
    },
    [googleSignIn, redirect, router, toast]
  );

  const handleGoogleError = useCallback((message: string) => {
    setError(message);
  }, []);

  if (authLoading) return null;

  return (
    <AuthBackdrop>
      <div className="auth-form text-center">
        <p className="eyebrow mb-3 text-primary">Your private account</p>
        <h1 className="section-title text-3xl text-foreground sm:text-4xl">
          Welcome to {theme.brand.name}
        </h1>
        <p className="body-copy mx-auto mb-8 mt-3 text-muted">
          Sign in to manage your orders, wishlist, and cart.
        </p>
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        {error && (
          <div role="alert" aria-live="polite" className="mt-4 border border-danger/25 bg-danger/10 p-3 text-left text-sm leading-relaxed text-danger animate-slide-up">
            {error}
          </div>
        )}
      </div>
    </AuthBackdrop>
  );
}
