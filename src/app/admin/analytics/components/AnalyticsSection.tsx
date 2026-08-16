"use client";

interface AnalyticsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

export default function AnalyticsSection({
  title,
  description,
  children,
  loading,
  error,
}: AnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
          {error}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
