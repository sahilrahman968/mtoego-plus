"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const AUTH_BANNER_SRC = "/images/hero-banner.jpg";

export default function AuthBackdrop({ children }: { children: ReactNode }) {
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
        {children}
      </div>
    </div>
  );
}
