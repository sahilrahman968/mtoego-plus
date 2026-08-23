import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Surface } from "./Surface";

export function AdminSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading admin page" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-admin-line" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-admin-line/70" />
      </div>
      <Surface className="space-y-3">
        <div className="h-10 w-full animate-pulse rounded-lg bg-admin-subtle" />
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="h-11 w-full animate-pulse rounded-lg bg-admin-subtle/80"
          />
        ))}
      </Surface>
    </div>
  );
}

// Row-shaped placeholder used inside DataTableShell so list pages keep their
// column rhythm while the first page loads.
export function AdminTableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div aria-label="Loading rows" aria-busy="true">
      <div className="flex items-center gap-4 border-b border-admin-line bg-admin-subtle/60 px-4 py-2.5">
        {Array.from({ length: columns }).map((_, column) => (
          <div
            key={column}
            className={`h-3 animate-pulse rounded bg-admin-line ${
              column === 0 ? "flex-1" : "w-16"
            }`}
          />
        ))}
      </div>
      <div className="divide-y divide-admin-line">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-4 py-3">
            <div className="size-9 shrink-0 animate-pulse rounded-lg bg-admin-subtle" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-2/5 animate-pulse rounded bg-admin-subtle" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-admin-subtle/80" />
            </div>
            {Array.from({ length: Math.max(0, columns - 1) }).map((_, column) => (
              <div
                key={column}
                className="hidden h-3 w-16 animate-pulse rounded bg-admin-subtle sm:block"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminFormSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <div className="space-y-5" aria-label="Loading form" aria-busy="true">
      {Array.from({ length: sections }).map((_, section) => (
        <Surface key={section} className="space-y-4">
          <div className="h-4 w-40 animate-pulse rounded bg-admin-line" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-admin-subtle" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-admin-subtle/80" />
              </div>
            ))}
          </div>
        </Surface>
      ))}
    </div>
  );
}

export function AdminErrorState({
  title = "Unable to load this page",
  message = "Something went wrong. Try again to continue.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Surface
      className="mx-auto flex max-w-xl flex-col items-center py-12 text-center"
      role="alert"
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-admin-danger-soft text-admin-danger">
        <AlertCircle aria-hidden="true" className="size-5" />
      </div>
      <h2 className="text-base font-semibold text-admin-heading">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-admin-muted">{message}</p>
      {onRetry && (
        <Button
          className="mt-5"
          variant="secondary"
          onClick={onRetry}
          icon={<RotateCcw aria-hidden="true" className="size-4" />}
        >
          Try again
        </Button>
      )}
    </Surface>
  );
}
