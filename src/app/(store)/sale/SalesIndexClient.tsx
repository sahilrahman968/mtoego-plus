"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchSales, type SaleCampaignPublic } from "@/lib/store-api";

export default function SalesIndexClient() {
  const [sales, setSales] = useState<SaleCampaignPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales()
      .then((res) => {
        if (res.success && res.data) setSales(res.data.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="body-copy text-muted">Loading sales…</p>;
  }

  if (!sales.length) {
    return (
      <p className="body-copy text-muted">
        No live or upcoming sales right now. Check back on the next drop.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {sales.map((sale) => (
        <Link
          key={sale._id}
          href={`/sale/${sale.slug}`}
          className="group overflow-hidden border border-border/80 bg-black/40"
        >
          <div className="relative aspect-[16/7] bg-black/70">
            {sale.banner?.url ? (
              <Image
                src={sale.banner.url}
                alt={sale.banner.alt || sale.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="absolute left-3 top-3 eyebrow-xs bg-primary px-2 py-1 text-white">
              {sale.status === "live" ? sale.badgeLabel : "Upcoming"}
            </span>
          </div>
          <div className="p-4">
            <h2 className="section-title text-lg text-foreground">{sale.title}</h2>
            {sale.subtitle ? (
              <p className="body-copy mt-1 text-sm text-muted">{sale.subtitle}</p>
            ) : null}
            <p className="eyebrow-xs mt-3 text-muted">
              {sale.status === "live" ? "Ends" : "Starts"}{" "}
              {new Date(sale.status === "live" ? sale.endsAt : sale.startsAt).toLocaleString("en-IN")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
