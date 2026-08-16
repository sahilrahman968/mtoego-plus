"use client";

import {
  AnalyticsPeriod,
  MAX_CUSTOM_DAYS,
  PeriodSelection,
  toDateInputValue,
} from "@/lib/analytics/periods";

const PRESETS: { value: Exclude<AnalyticsPeriod, "custom">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

interface PeriodToggleProps {
  value: PeriodSelection;
  onChange: (selection: PeriodSelection) => void;
}

function defaultCustomRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

export default function PeriodToggle({ value, onChange }: PeriodToggleProps) {
  const isCustom = value.period === "custom";
  const from = value.from || defaultCustomRange().from;
  const to = value.to || defaultCustomRange().to;

  const minFrom = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    return toDateInputValue(d);
  })();
  const maxTo = toDateInputValue(new Date());

  function selectPreset(period: Exclude<AnalyticsPeriod, "custom">) {
    onChange({ period });
  }

  function selectCustom() {
    onChange({
      period: "custom",
      from,
      to,
    });
  }

  function updateCustom(nextFrom: string, nextTo: string) {
    let fromDate = nextFrom;
    let toDate = nextTo;

    // Clamp inverted range
    if (fromDate && toDate && fromDate > toDate) {
      fromDate = nextTo;
      toDate = nextFrom;
    }

    // Clamp max span to 2 years by moving `from` forward if needed
    if (fromDate && toDate) {
      const fromMs = new Date(fromDate + "T00:00:00").getTime();
      const toMs = new Date(toDate + "T00:00:00").getTime();
      const days = Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24)) + 1;
      if (days > MAX_CUSTOM_DAYS) {
        const clamped = new Date(toMs);
        clamped.setDate(clamped.getDate() - (MAX_CUSTOM_DAYS - 1));
        fromDate = toDateInputValue(clamped);
      }
    }

    onChange({ period: "custom", from: fromDate, to: toDate });
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {PRESETS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectPreset(opt.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value.period === opt.value
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          onClick={selectCustom}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isCustom
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="sr-only">From</span>
            <input
              type="date"
              value={from}
              min={minFrom}
              max={to || maxTo}
              onChange={(e) => updateCustom(e.target.value, to)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <span className="text-xs text-slate-400">to</span>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <span className="sr-only">To</span>
            <input
              type="date"
              value={to}
              min={from || minFrom}
              max={maxTo}
              onChange={(e) => updateCustom(from, e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900"
            />
          </label>
          <span className="text-xs text-slate-400">Max {MAX_CUSTOM_DAYS} days</span>
        </div>
      )}
    </div>
  );
}
