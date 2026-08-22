"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import StatusBadge from "../../../components/StatusBadge";
import LoadingSpinner from "../../../components/LoadingSpinner";

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

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/admin/sales/${params.id}/analytics`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return <p className="text-sm text-admin-muted">Could not load sale analytics.</p>;
  }

  return (
    <div>
      <PageHeader
        title={data.campaign.title}
        description={`Performance for /sale/${data.campaign.slug}`}
        action={{ label: "Edit campaign", href: `/admin/sales/${data.campaign._id}` }}
      />

      <div className="mb-6 flex items-center gap-3 text-sm text-admin-muted">
        <StatusBadge status={data.campaign.status} />
        <span>{data.campaign.itemCount} products</span>
        <span>
          {new Date(data.campaign.startsAt).toLocaleString("en-IN")} –{" "}
          {new Date(data.campaign.endsAt).toLocaleString("en-IN")}
        </span>
        <Link href={`/sale/${data.campaign.slug}`} className="text-admin-body underline" target="_blank">
          View storefront
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Views</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.views}</p>
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Add to carts</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.addToCarts}</p>
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Orders</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.orders}</p>
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Sale revenue (ex-GST)</p>
          <p className="mt-2 text-2xl font-bold">
            ₹{Math.round(data.counters.revenue).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">Units sold</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.unitsSold}</p>
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">View → cart</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.cartRate}%</p>
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <p className="text-sm text-admin-muted">View → order</p>
          <p className="mt-2 text-2xl font-bold">{data.counters.conversionRate}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-admin-heading">Top sale products</h3>
          {data.products.length === 0 ? (
            <p className="text-sm text-admin-faint">No paid sale orders yet.</p>
          ) : (
            <table className="w-full text-sm">
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
          )}
        </div>
        <div className="rounded-xl border border-admin-line bg-admin-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-admin-heading">Recent sale orders</h3>
          {data.recentOrders.length === 0 ? (
            <p className="text-sm text-admin-faint">No attributed orders yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentOrders.map((order) => (
                <li key={order._id}>
                  <Link
                    href={`/admin/orders/${order._id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-admin-hover"
                  >
                    <span className="text-sm font-medium">{order.orderNumber}</span>
                    <span className="text-sm text-admin-muted">
                      ₹{Math.round(order.pricing.grandTotal).toLocaleString("en-IN")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
