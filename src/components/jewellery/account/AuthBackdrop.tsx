"use client";

import type { ReactNode } from "react";

export default function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-6rem)] items-center justify-center overflow-hidden px-4 py-16">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(161,98,7,0.12),transparent_32%),linear-gradient(135deg,#F3ECE0_0%,#FAF8F3_50%,#ECE2D3_100%)]" />
      <div aria-hidden="true" className="absolute left-[8%] top-[18%] size-36 rounded-full border border-primary/20 sm:size-56" />
      <div aria-hidden="true" className="absolute bottom-[10%] right-[7%] size-52 rounded-full border border-primary/15 sm:size-80" />
      <div className="relative w-full max-w-md border border-border/80 bg-background/88 p-7 shadow-[0_28px_80px_rgba(77,57,31,0.12)] backdrop-blur-xl sm:p-10">
        {children}
      </div>
    </div>
  );
}
