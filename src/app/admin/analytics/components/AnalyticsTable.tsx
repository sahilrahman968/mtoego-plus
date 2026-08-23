"use client";

import Link from "next/link";
import InfoTooltip from "@/app/admin/components/InfoTooltip";

export interface AnalyticsColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

interface AnalyticsTableProps<T> {
  title: string;
  info?: string;
  columns: AnalyticsColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export default function AnalyticsTable<T>({
  title,
  info,
  columns,
  rows,
  emptyMessage = "No data yet",
  rowKey,
}: AnalyticsTableProps<T>) {
  return (
    <div className="flex flex-col overflow-visible rounded-xl border border-admin-line bg-admin-surface">
      <div className="flex items-center justify-between gap-2 overflow-visible border-b border-admin-line px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading">
          {title}
          {info && <InfoTooltip text={info} />}
        </h3>
        {rows.length > 0 && (
          <span className="shrink-0 text-xs text-admin-faint tabular-nums">
            {rows.length}
          </span>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-admin-muted">{emptyMessage}</p>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={title}
          tabIndex={0}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-line bg-admin-subtle/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`whitespace-nowrap px-4 py-2 text-xs font-medium text-admin-muted ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line">
              {rows.map((row) => (
                <tr key={rowKey(row)} className="transition-colors hover:bg-admin-hover">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 text-admin-body ${
                        col.align === "right"
                          ? "whitespace-nowrap text-right tabular-nums"
                          : "text-left"
                      }`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProductLink({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Link
      href={`/admin/products/${id}`}
      className="font-medium text-admin-heading hover:underline"
    >
      {label}
    </Link>
  );
}

export function OrderLink({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Link
      href={`/admin/orders/${id}`}
      className="font-medium text-admin-heading hover:underline"
    >
      {label}
    </Link>
  );
}
