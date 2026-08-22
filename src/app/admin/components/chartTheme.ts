import { theme } from "@/config/theme";

// Recharts paints to SVG attributes and inline styles, so it needs literal
// colours rather than CSS variables. Reading them off the admin palette keeps
// the charts in step with the rest of the panel.
const admin = theme.adminColors;

export const chart = {
  grid: admin.line,
  axis: admin.faint,
  series: admin.body,
  seriesMuted: admin.faint,
  seriesFill: admin.subtle,
  emphasis: admin.heading,
} as const;

export const chartTooltipStyle = {
  backgroundColor: admin.surface,
  border: `1px solid ${admin.line}`,
  borderRadius: "0.5rem",
  boxShadow: "0 8px 24px -12px rgba(22, 24, 29, 0.25)",
  color: admin.heading,
  fontSize: "0.875rem",
} as const;

export const chartAxisTick = (fontSize: number) => ({
  fill: chart.axis,
  fontSize,
});
