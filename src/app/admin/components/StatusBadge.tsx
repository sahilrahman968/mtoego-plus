const statusStyles: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700 ring-gray-300/40",
  paid: "bg-gray-50 text-gray-700 ring-gray-300/40",
  processing: "bg-gray-100 text-gray-800 ring-gray-400/30",
  shipped: "bg-gray-100 text-gray-700 ring-gray-300/40",
  delivered: "bg-gray-50 text-gray-900 ring-gray-400/30",
  cancelled: "bg-gray-50 text-gray-500 ring-gray-300/30",
  refunded: "bg-gray-50 text-gray-500 ring-gray-300/30",
  active: "bg-gray-50 text-gray-900 ring-gray-400/30",
  inactive: "bg-gray-50 text-gray-500 ring-gray-300/30",
  percentage: "bg-gray-50 text-gray-700 ring-gray-300/40",
  flat: "bg-gray-100 text-gray-700 ring-gray-300/40",
  super_admin: "bg-gray-100 text-gray-900 ring-gray-400/30",
  staff: "bg-gray-50 text-gray-700 ring-gray-300/40",
  customer: "bg-gray-50 text-gray-500 ring-gray-300/30",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-slate-50 text-slate-700 ring-slate-600/20";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ring-1 ring-inset capitalize ${style} ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
