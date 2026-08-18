"use client";

import { Info } from "lucide-react";

export default function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex shrink-0 group/info">
      <button
        type="button"
        className="inline-flex text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-slate-600"
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover/info:opacity-100 group-focus-within/info:opacity-100"
      >
        {text}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900"
        />
      </span>
    </span>
  );
}
