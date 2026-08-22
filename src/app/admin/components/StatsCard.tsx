import InfoTooltip from "./InfoTooltip";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  info?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

// The icon chip is deliberately neutral: in a KPI grid, colour should mark the
// one thing that needs attention (the trend delta), not every tile.
export default function StatsCard({ title, value, icon, info, trend }: StatsCardProps) {
  return (
    <div className="bg-admin-surface rounded-xl border border-admin-line p-5 transition-shadow hover:shadow-[0_1px_2px_rgba(22,24,29,0.06),0_8px_24px_-12px_rgba(22,24,29,0.18)] overflow-visible">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-admin-muted">
            <span className="truncate">{title}</span>
            {info && <InfoTooltip text={info} />}
          </p>
          <p className="mt-2 text-2xl font-bold text-admin-heading">{value}</p>
          {trend && (
            <p
              className={`mt-1 text-xs font-medium ${
                trend.positive ? "text-admin-success" : "text-admin-danger"
              }`}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 p-2.5 rounded-lg ring-1 bg-admin-subtle text-admin-body ring-admin-line">
          {icon}
        </div>
      </div>
    </div>
  );
}
