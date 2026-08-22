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
        <h2 className="text-lg font-semibold text-admin-heading">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-admin-muted">{description}</p>
        )}
      </div>
      {loading ? (
        <div className="bg-admin-surface rounded-xl border border-admin-line p-10 text-center text-sm text-admin-muted">
          Loading…
        </div>
      ) : error ? (
        <div className="bg-admin-surface rounded-xl border border-admin-line p-6 text-sm text-admin-muted">
          {error}
        </div>
      ) : (
        children
      )}
    </section>
  );
}
