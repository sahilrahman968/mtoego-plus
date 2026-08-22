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
    <div className="bg-admin-surface rounded-xl border border-admin-line overflow-visible">
      <div className="px-5 py-4 border-b border-admin-line overflow-visible">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-admin-heading">
          {title}
          {info && <InfoTooltip text={info} />}
        </h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-admin-muted text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-line bg-admin-subtle/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 font-medium text-admin-muted ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowKey(row)} className="border-b border-admin-line last:border-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-admin-body ${
                        col.align === "right" ? "text-right" : "text-left"
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
      className="text-admin-heading hover:underline font-medium"
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
      className="text-admin-heading hover:underline font-medium"
    >
      {label}
    </Link>
  );
}
