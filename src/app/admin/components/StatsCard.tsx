interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  color: "indigo" | "emerald" | "amber" | "rose";
}

const colorMap = {
  indigo: {
    bg: "bg-gray-100",
    icon: "text-gray-900",
    ring: "ring-gray-200",
  },
  emerald: {
    bg: "bg-gray-50",
    icon: "text-gray-700",
    ring: "ring-gray-200",
  },
  amber: {
    bg: "bg-gray-100",
    icon: "text-gray-600",
    ring: "ring-gray-200",
  },
  rose: {
    bg: "bg-gray-50",
    icon: "text-gray-500",
    ring: "ring-gray-200",
  },
};

export default function StatsCard({ title, value, icon, trend, color }: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trend.positive ? "text-gray-700" : "text-gray-500"}`}>
              {trend.positive ? "+" : ""}{trend.value}
            </p>
          )}
        </div>
        <div className={`flex-shrink-0 p-2.5 rounded-lg ring-1 ${colors.bg} ${colors.icon} ${colors.ring}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
