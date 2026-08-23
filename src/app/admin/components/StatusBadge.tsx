// Status colour carries meaning, so it maps to the semantic admin tokens rather
// than to a neutral shade per status: greens read as healthy, ambers as waiting,
// reds as failed, and anything inert stays grey.
const NEUTRAL = "bg-admin-subtle text-admin-body ring-admin-line";
const INERT = "bg-admin-subtle text-admin-faint ring-admin-line";
const SUCCESS = "bg-admin-success-soft text-admin-success ring-admin-success-line";
const WARNING = "bg-admin-warning-soft text-admin-warning ring-admin-warning-line";
const DANGER = "bg-admin-danger-soft text-admin-danger ring-admin-danger-line";
const INFO = "bg-admin-info-soft text-admin-info ring-admin-info-line";

const statusStyles: Record<string, string> = {
  pending: WARNING,
  paid: SUCCESS,
  processing: INFO,
  shipped: INFO,
  delivered: SUCCESS,
  success: SUCCESS,
  cancelled: DANGER,
  failed: DANGER,
  refunded: DANGER,
  active: SUCCESS,
  inactive: INERT,
  live: SUCCESS,
  scheduled: WARNING,
  paused: INERT,
  ended: INERT,
  percentage: NEUTRAL,
  flat: NEUTRAL,
  super_admin: NEUTRAL,
  staff: NEUTRAL,
  customer: INERT,
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = statusStyles[status] || NEUTRAL;
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      <span className="sr-only">Status: </span>
      {label}
    </span>
  );
}
