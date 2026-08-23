"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/app/admin/components/Button";

interface AnalyticsSectionProps {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Section-shaped placeholder shown while loading. */
  skeleton?: ReactNode;
}

export default function AnalyticsSection({
  id,
  title,
  description,
  children,
  loading,
  error,
  onRetry,
  skeleton,
}: AnalyticsSectionProps) {
  const headingId = `${id}-heading`;

  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={headingId}
      aria-busy={loading || undefined}
      className="scroll-mt-16 space-y-3 outline-none"
    >
      <div className="border-b border-admin-line pb-2">
        <h2 id={headingId} className="text-sm font-semibold text-admin-heading">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
        )}
      </div>
      {loading ? (
        skeleton ?? (
          <p className="rounded-xl border border-admin-line bg-admin-surface px-4 py-8 text-center text-sm text-admin-muted">
            Loading…
          </p>
        )
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-admin-danger-line bg-admin-danger-soft px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-start gap-2 text-sm text-admin-danger">
            <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="shrink-0"
              icon={<RotateCcw aria-hidden="true" className="size-3.5" />}
            >
              Retry
            </Button>
          )}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
