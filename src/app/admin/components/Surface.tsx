import type { HTMLAttributes, ReactNode } from "react";

interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Surface({
  children,
  padded = true,
  className = "",
  ...props
}: SurfaceProps) {
  return (
    <div
      className={`rounded-xl border border-admin-line bg-admin-surface shadow-[0_1px_2px_rgba(22,24,29,0.03)] ${
        padded ? "p-5" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface SectionProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({
  title,
  description,
  action,
  children,
  className = "",
  ...props
}: SectionProps) {
  return (
    <section className={`space-y-4 ${className}`} {...props}>
      {(title || description || action) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-admin-heading">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-admin-muted">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
