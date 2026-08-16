export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || !Number.isFinite(denominator)) return 0;
  if (!Number.isFinite(numerator)) return 0;
  return numerator / denominator;
}

/** Percent change from previous to current. null if previous is 0 and current is 0. */
export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function formatCurrency(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function hoursBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

export interface MetricWithDelta {
  value: number;
  previous: number;
  deltaPct: number | null;
}

export function withDelta(current: number, previous: number): MetricWithDelta {
  return {
    value: round2(current),
    previous: round2(previous),
    deltaPct: deltaPct(current, previous),
  };
}
