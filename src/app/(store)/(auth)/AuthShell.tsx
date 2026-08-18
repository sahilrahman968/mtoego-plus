"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import AuthBackdrop from "@/components/store/AuthBackdrop";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";

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
      <div className="auth-form">
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
        />

        {error && (
          <div className="mt-4 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm leading-relaxed text-danger animate-slide-up">
            {error}
          </div>
        )}
      </div>
    </AuthBackdrop>
  );
}
