"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 py-3 sm:flex-row"
      aria-label="Pagination"
    >
      <p className="text-sm tabular text-admin-muted" aria-live="polite">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          variant="secondary"
          size="sm"
          className="px-2"
          aria-label="Go to previous page"
          icon={<ChevronLeft aria-hidden="true" className="size-4" />}
        >
          <span className="hidden sm:inline">Previous</span>
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-admin-faint" aria-hidden="true">…</span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              aria-label={`Go to page ${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`size-9 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus ${
                p === page
                  ? "bg-admin-primary text-white font-medium"
                  : "text-admin-muted hover:bg-admin-hover"
              }`}
            >
              {p}
            </button>
          )
        )}
        <Button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          variant="secondary"
          size="sm"
          className="px-2"
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
