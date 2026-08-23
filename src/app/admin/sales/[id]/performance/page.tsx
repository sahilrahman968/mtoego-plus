"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import { AdminErrorState, AdminSkeleton } from "../../../components/FeedbackState";
import StatsCard, { KpiGrid } from "../../../components/StatsCard";
import { Surface } from "../../../components/Surface";

interface AnalyticsPayload {
  campaign: {
    _id: string;
    title: string;
    slug: string;
    status: string;
    startsAt: string;
    endsAt: string;
    itemCount: number;
  };
  counters: {
    views: number;
    addToCarts: number;
    orders: number;
    unitsSold: number;
    revenue: number;
    conversionRate: number;
    cartRate: number;
  };
  products: {
    productId: string;
    title: string;
    units: number;
    revenue: number;
    orders: number;
  }[];
  recentOrders: {
    _id: string;
    orderNumber: string;
    status: string;
    pricing: { grandTotal: number };
    createdAt: string;
  }[];
}

export default function SalePerformancePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPerformance = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sales/${params.id}/analytics`);
      const json = await response.json();
      if (json.success) setData(json.data);
      else setError(json.message || "Could not load sale analytics.");
    } catch {
      setError("Could not load sale analytics.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchPerformance();
  }, [fetchPerformance]);

  if (loading) return <AdminSkeleton />;
  if (error || !data) return (
    <AdminErrorState
      title="Unable to load sale performance"
      message={error || "The campaign analytics are unavailable."}
      onRetry={fetchPerformance}
    />
  );

  return (
    <div>
      <PageHeader
        title={data.campaign.title}
        description={`Performance for /sale/${data.campaign.slug}`}
        action={{ label: "Edit campaign", href: `/admin/sales/${data.campaign._id}` }}
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-admin-muted">
        <StatusBadge status={data.campaign.status} />
        <span>{data.campaign.itemCount} products</span>
        <span>
          {new Date(data.campaign.startsAt).toLocaleString("en-IN")} –{" "}
          {new Date(data.campaign.endsAt).toLocaleString("en-IN")}
        </span>
        <Link
          href={`/sale/${data.campaign.slug}`}
          className="inline-flex items-center gap-1 font-medium text-admin-body underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
          target="_blank"
          rel="noreferrer"
        >
          View storefront
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </div>

      <KpiGrid columns={4} className="mb-2.5">
        <StatsCard title="Views" value={data.counters.views.toLocaleString("en-IN")} />
        <StatsCard title="Add to carts" value={data.counters.addToCarts.toLocaleString("en-IN")} />
        <StatsCard title="Orders" value={data.counters.orders.toLocaleString("en-IN")} />
        <StatsCard title="Revenue (ex-GST)" value={`₹${Math.round(data.counters.revenue).toLocaleString("en-IN")}`} />
      </KpiGrid>
      <KpiGrid columns={3} className="mb-6">
        <StatsCard title="Units sold" value={data.counters.unitsSold.toLocaleString("en-IN")} />
        <StatsCard title="View to cart rate" value={`${data.counters.cartRate}%`} />
        <StatsCard title="View to order rate" value={`${data.counters.conversionRate}%`} />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface className="min-w-0">
          <h3 className="mb-4 text-sm font-semibold text-admin-heading">Top sale products</h3>
          {data.products.length === 0 ? (
            <p className="text-sm text-admin-faint">No paid sale orders yet.</p>
          ) : (
            <div
              className="overflow-x-auto"
              role="region"
              aria-label="Top sale products"
              tabIndex={0}
            >
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left text-admin-muted">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Units</th>
                  <th className="pb-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((row) => (
                  <tr key={row.productId} className="border-t border-admin-line">
                    <td className="py-2">{row.title}</td>
                    <td className="py-2">{row.units}</td>
                    <td className="py-2">₹{Math.round(row.revenue).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </Surface>
        <Surface>
          <h3 className="mb-4 text-sm font-semibold text-admin-heading">Recent sale orders</h3>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-admin-faint">No attributed orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentOrders.map((order) => (
                <li key={order._id}>
                  <Link
                    href={`/admin/orders/${order._id}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-admin-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
                  >
                    <span className="truncate text-sm font-medium">{order.orderNumber}</span>
                    <span className="shrink-0 text-sm text-admin-muted">
                      ₹{Math.round(order.pricing.grandTotal).toLocaleString("en-IN")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}
