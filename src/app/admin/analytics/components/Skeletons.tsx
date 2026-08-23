import type { CSSProperties } from "react";
import { KpiGrid } from "@/app/admin/components/StatsCard";

// Section-shaped placeholders: each one mirrors the layout it replaces so the
// page does not jump when real data lands.

function Bar({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`animate-pulse rounded bg-admin-subtle ${className}`} style={style} />
  );
}

export function KpiSkeleton({
  count = 4,
  columns = 4,
}: {
  count?: number;
  columns?: 2 | 3 | 4 | 6;
}) {
  return (
    <KpiGrid columns={columns}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-admin-line bg-admin-surface px-3.5 py-3"
        >
          <Bar className="h-3 w-20" />
          <Bar className="mt-2.5 h-5 w-24" />
          <Bar className="mt-2 h-3 w-16" />
        </div>
      ))}
    </KpiGrid>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-admin-line bg-admin-surface p-4">
      <Bar className="h-3.5 w-40" />
      <Bar className="mt-2 h-3 w-56" />
      <div className="mt-4 flex h-56 items-end gap-2">
        {[45, 70, 35, 85, 55, 65, 40, 75, 50, 60].map((height, i) => (
          <Bar key={i} className="flex-1" style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-admin-line bg-admin-surface">
      <div className="border-b border-admin-line px-4 py-3">
        <Bar className="h-3.5 w-44" />
      </div>
      <div className="divide-y divide-admin-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Bar className="h-3 flex-1" />
            <Bar className="h-3 w-12" />
            <Bar className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({
  count = 2,
  variant = "table",
}: {
  count?: number;
  variant?: "table" | "chart";
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, i) =>
        variant === "chart" ? <ChartSkeleton key={i} /> : <TableSkeleton key={i} />
      )}
    </div>
  );
}
