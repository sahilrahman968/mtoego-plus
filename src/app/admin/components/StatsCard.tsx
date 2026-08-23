import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import InfoTooltip from "./InfoTooltip";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  info?: string;
  /** Secondary line under the value, e.g. sample size or median/avg detail. */
  hint?: ReactNode;
  /** Adds a follow-up link so the metric can be acted on directly. */
  href?: string;
  actionLabel?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

// Metric tiles read as a strip of dense cells rather than a wall of cards: the
// label stays small, the value carries the weight, and colour is reserved for
// the delta so only the moving number draws the eye. The action stays a separate
// link rather than wrapping the tile, so the info tooltip's button is not nested
// inside an anchor.
export default function StatsCard({
  title,
  value,
  icon,
  info,
  hint,
  href,
  actionLabel = "View",
  trend,
}: StatsCardProps) {
  return (
    <div className="overflow-visible rounded-lg border border-admin-line bg-admin-surface px-3.5 py-3">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="shrink-0 text-admin-faint [&_svg]:size-4">{icon}</span>
        )}
        <span className="truncate text-xs font-medium text-admin-muted">{title}</span>
        {info && <InfoTooltip text={info} />}
      </div>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-admin-heading tabular-nums">
        {value}
      </p>
      {trend && (
        <p
          className={`mt-0.5 text-xs font-medium tabular-nums ${
            trend.positive ? "text-admin-success" : "text-admin-danger"
          }`}
        >
          {trend.value}
        </p>
      )}
      {hint}
      {href && (
        <Link
          href={href}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-admin-body hover:text-admin-heading hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
        >
          {actionLabel}
          <span className="sr-only"> — {title}</span>
          <ArrowUpRight aria-hidden="true" className="size-3" />
        </Link>
      )}
    </div>
  );
}

const columnClasses: Record<2 | 3 | 4 | 6, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6",
};

export function KpiGrid({
  columns = 4,
  children,
  className = "",
}: {
  columns?: 2 | 3 | 4 | 6;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-2.5 ${columnClasses[columns]} ${className}`}>
      {children}
    </div>
  );
}

/** Small metric hint that matches the tile's secondary line. */
export function KpiHint({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-admin-muted tabular-nums">{children}</p>;
}
