"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";

const AUTH_BANNER_SRC = "/images/hero-banner.jpg";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-12 pt-28">
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0"
      >
        <Image
          src={AUTH_BANNER_SRC}
          alt=""
          fill
          sizes="100vw"
          className="object-cover animate-hero-slow-zoom"
          priority
        />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.28)_68%,rgba(0,0,0,0.75)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/40" />

      <div className="relative w-full max-w-md rounded-2xl bg-white/[0.02] p-6 backdrop-blur-[2px] backdrop-saturate-150 sm:p-8">
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
      </div>
    </div>
  );
}
