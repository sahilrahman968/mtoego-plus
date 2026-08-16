"use client";

import Link from "next/link";

export interface AnalyticsColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => React.ReactNode;
}

interface AnalyticsTableProps<T> {
  title: string;
  columns: AnalyticsColumn<T>[];
  rows: T[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
}

export default function AnalyticsTable<T>({
  title,
  columns,
  rows,
  emptyMessage = "No data yet",
  rowKey,
}: AnalyticsTableProps<T>) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-sm text-slate-500 text-center">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 font-medium text-slate-500 ${
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
                <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2.5 text-slate-800 ${
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
      className="text-slate-900 hover:underline font-medium"
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
      className="text-slate-900 hover:underline font-medium"
    >
      {label}
    </Link>
  );
}
