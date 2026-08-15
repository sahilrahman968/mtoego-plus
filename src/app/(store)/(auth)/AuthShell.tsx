"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/store/Toast";
import GoogleSignInButton from "@/components/store/GoogleSignInButton";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { googleSignIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const isRegister = pathname.startsWith("/register");

  // Tagged with the route it came from so a stale error doesn't survive a switch
  // between sign-in and create-account.
  const [googleError, setGoogleError] = useState<{
    path: string;
    message: string;
  } | null>(null);
  const error = googleError?.path === pathname ? googleError.message : "";

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

  const handleGoogleSuccess = useCallback(
    async (credential: string) => {
      setGoogleError(null);
      const res = await googleSignIn(credential);
      if (res.success) {
        toast(isRegister ? "Account created successfully!" : "Welcome!", "success");
        router.replace(redirect);
      } else {
        setGoogleError({ path: pathname, message: res.message });
      }
    },
    [googleSignIn, isRegister, pathname, redirect, router, toast]
  );

  const handleGoogleError = useCallback(
    (message: string) => setGoogleError({ path: pathname, message }),
    [pathname]
  );

  if (authLoading) return null;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link
            href="/"
            className="relative mx-auto mb-2 block h-10 w-[11.25rem] overflow-hidden"
            aria-label="Motoego Home"
          >
            <Image
              src="/logo.svg"
              alt="Motoego"
              fill
              sizes="180px"
              className="object-contain object-left"
              priority
            />
          </Link>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={isRegister ? "register-tagline" : "login-tagline"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-muted"
            >
              {isRegister
                ? "Join Motoego+ for exclusive deals and easy checkout"
                : "Sign in to your account to continue shopping"}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="auth-form px-1 sm:px-6">
          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
          />

          {error && (
            <div className="p-3 mt-4 bg-danger/10 border border-danger/25 rounded-lg text-sm text-danger animate-slide-up">
              {error}
            </div>
          )}

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-background px-3 text-muted">
                or continue with phone
              </span>
            </div>
          </div>

          {/* Reserved height keeps the logo and Google button from shifting
              while the sign-in and create-account forms cross-fade. */}
          <div className="min-h-[13.5rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isRegister ? "register" : "login"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
