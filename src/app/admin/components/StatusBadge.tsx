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
  cancelled: DANGER,
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

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset capitalize ${style} ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
