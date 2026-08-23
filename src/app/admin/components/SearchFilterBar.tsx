import { Search } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";

export default function SearchFilterBar({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  id = "admin-search",
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-sm">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-admin-faint"
        />
        <input
          id={id}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-10 w-full rounded-lg border border-admin-line-strong bg-admin-surface py-2 pl-9 pr-3 text-sm text-admin-heading shadow-sm outline-none transition placeholder:text-admin-faint focus:border-admin-primary focus:ring-2 focus:ring-admin-focus/50"
        />
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </div>
  );
}

interface FilterSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
}

/**
 * Compact select for the filter row. The label stays visually hidden because
 * every option is written to read as a filter statement on its own.
 */
export function FilterSelect({
  id,
  label,
  className = "",
  children,
  ...props
}: FilterSelectProps) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        className={`min-h-10 max-w-[12rem] rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-2 text-sm text-admin-body shadow-sm outline-none transition focus:border-admin-primary focus:ring-2 focus:ring-admin-focus/50 ${className}`}
        {...props}
      >
        {children}
      </select>
    </>
  );
}
