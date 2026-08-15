"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const AUTH_BANNER_SRC = "/images/hero-banner.jpg";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const isRegister = pathname.startsWith("/register");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, authLoading, router, redirect]);

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

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/55 p-6 shadow-[0_0_40px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-8">
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
                : "Sign in with WhatsApp OTP to continue shopping"}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="auth-form">
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
