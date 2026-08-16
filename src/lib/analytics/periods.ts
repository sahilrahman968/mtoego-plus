export type AnalyticsPeriod = "today" | "7d" | "30d" | "custom";

/** Inclusive max span for a custom range (2 years). */
export const MAX_CUSTOM_DAYS = 365 * 2;

export interface PeriodWindow {
  period: AnalyticsPeriod;
  label: string;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
  /** Inclusive day count for the current window (for series length) */
  dayCount: number;
  /** Present when period === "custom" (YYYY-MM-DD) */
  from?: string;
  to?: string;
}

export interface PeriodSelection {
  period: AnalyticsPeriod;
  /** YYYY-MM-DD — required when period is custom */
  from?: string;
  to?: string;
}

const PERIOD_LABELS: Record<Exclude<AnalyticsPeriod, "custom">, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Parse YYYY-MM-DD as local calendar date. */
export function parseDateInput(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function inclusiveDayCount(start: Date, end: Date): number {
  const s = startOfDay(start).getTime();
  const e = startOfDay(end).getTime();
  return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

export function parsePeriod(raw: string | null): AnalyticsPeriod {
  if (raw === "today" || raw === "7d" || raw === "30d" || raw === "custom") {
    return raw;
  }
  return "30d";
}

function equalPriorWindow(start: Date, end: Date): { prevStart: Date; prevEnd: Date } {
  const windowMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - windowMs);
  return { prevStart, prevEnd };
}

/**
 * Returns current and previous equal-length windows.
 * - today: calendar today vs yesterday
 * - 7d / 30d: rolling windows ending now
 * - custom: [from, to] inclusive, max MAX_CUSTOM_DAYS
 */
export function getPeriodWindow(
  period: AnalyticsPeriod,
  now = new Date(),
  custom?: { from: string; to: string }
): PeriodWindow {
  if (period === "custom") {
    if (!custom?.from || !custom?.to) {
      throw new Error("Custom period requires from and to dates (YYYY-MM-DD)");
    }
    const fromDate = parseDateInput(custom.from);
    const toDate = parseDateInput(custom.to);
    if (!fromDate || !toDate) {
      throw new Error("Invalid custom date format; use YYYY-MM-DD");
    }
    if (fromDate.getTime() > toDate.getTime()) {
      throw new Error("Custom range start must be on or before end");
    }
    const dayCount = inclusiveDayCount(fromDate, toDate);
    if (dayCount > MAX_CUSTOM_DAYS) {
      throw new Error(`Custom range cannot exceed ${MAX_CUSTOM_DAYS} days (2 years)`);
    }

    const start = startOfDay(fromDate);
    const end = endOfDay(toDate);
    const { prevStart, prevEnd } = equalPriorWindow(start, end);
    const label = `${toDateInputValue(fromDate)} → ${toDateInputValue(toDate)}`;

    return {
      period: "custom",
      label,
      start,
      end,
      prevStart,
      prevEnd,
      dayCount,
      from: toDateInputValue(fromDate),
      to: toDateInputValue(toDate),
    };
  }

  const end = new Date(now);
  let start: Date;
  let dayCount: number;

  if (period === "today") {
    start = startOfDay(now);
    dayCount = 1;
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = startOfDay(prevEnd);
    return {
      period,
      label: PERIOD_LABELS[period],
      start,
      end: endOfDay(now),
      prevStart,
      prevEnd,
      dayCount,
    };
  }

  dayCount = period === "7d" ? 7 : 30;
  start = new Date(end);
  start.setDate(start.getDate() - (dayCount - 1));
  start = startOfDay(start);

  const { prevStart, prevEnd } = equalPriorWindow(start, end);

  return {
    period,
    label: PERIOD_LABELS[period],
    start,
    end,
    prevStart,
    prevEnd,
    dayCount,
  };
}

/**
 * Resolve period window from API query params.
 * Supports: period=today|7d|30d|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export function getPeriodWindowFromSearchParams(
  searchParams: URLSearchParams,
  now = new Date()
): PeriodWindow {
  const period = parsePeriod(searchParams.get("period"));
  if (period === "custom") {
    return getPeriodWindow(period, now, {
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    });
  }
  return getPeriodWindow(period, now);
}

/** Build query string for analytics API fetches. */
export function buildPeriodQuery(selection: PeriodSelection): string {
  const params = new URLSearchParams();
  params.set("period", selection.period);
  if (selection.period === "custom" && selection.from && selection.to) {
    params.set("from", selection.from);
    params.set("to", selection.to);
  }
  return params.toString();
}

export function eachDayLabel(start: Date, dayCount: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const date = toDateInputValue(d);
    const label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    out.push({ date, label });
  }
  return out;
}
