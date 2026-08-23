import type { ReactNode } from "react";
import { Surface } from "./Surface";

export default function DataTableShell({
  children,
  footer,
  label,
}: {
  children: ReactNode;
  footer?: ReactNode;
  label?: string;
}) {
  return (
    <Surface padded={false} className="overflow-hidden">
      <div className="overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      {footer && <div className="border-t border-admin-line px-3">{footer}</div>}
    </Surface>
  );
}
