"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchSales, type SaleCampaignPublic } from "@/lib/store-api";

const STATUS_LABEL: Record<SaleCampaignPublic["status"], string> = {
  live: "Live now",
  scheduled: "Upcoming",
  ended: "Ended",
  paused: "Paused",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function SaleCardSkeleton() {
  return (
    <div className="border border-border bg-card">
      <div className="aspect-[16/9] animate-pulse bg-[#EEE9E0]" />
      <div className="space-y-3 p-6">
        <div className="h-6 w-2/3 animate-pulse bg-card-hover" />
        <div className="h-4 w-full animate-pulse bg-card-hover" />
        <div className="h-3 w-40 animate-pulse bg-card-hover" />
      </div>
    </div>
  );
}

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
    return (
      <div className="grid gap-8 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <SaleCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!sales.length) {
    return (
      <div className="border border-border bg-card px-6 py-20 text-center">
        <h2 className="text-2xl">No private sales right now</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
          Our next event is being prepared. Explore the collection in the meantime.
        </p>
        <Link href="/products" className="j-button-primary mt-8">
          View all jewellery
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-8 sm:grid-cols-2 lg:gap-10">
      {sales.map((sale) => {
        const upcoming = sale.status === "scheduled";
        return (
          <li key={sale._id}>
            <Link
              href={`/sale/${sale.slug}`}
              className="group flex h-full cursor-pointer flex-col border border-border bg-card transition-colors hover:border-foreground/40"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-[#EEE9E0]">
                {sale.banner?.url && (
                  <Image
                    src={sale.banner.url}
                    alt={sale.banner.alt || sale.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={`object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
                      sale.status === "ended" ? "grayscale" : ""
                    }`}
                  />
                )}
                <span className="absolute left-4 top-4 bg-background/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
                  {sale.status === "live" ? sale.badgeLabel : STATUS_LABEL[sale.status]}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h2 className="text-2xl transition-colors group-hover:text-primary sm:text-3xl">
                  {sale.title}
                </h2>
                {sale.subtitle && (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{sale.subtitle}</p>
                )}

                <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 text-xs uppercase tracking-[0.12em]">
                  <div>
                    <dt className="text-muted">{upcoming ? "Opens" : "Closes"}</dt>
                    <dd className="tabular mt-1.5 normal-case tracking-normal text-foreground">
                      {formatDateTime(upcoming ? sale.startsAt : sale.endsAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Pieces</dt>
                    <dd className="tabular mt-1.5 normal-case tracking-normal text-foreground">
                      {sale.itemCount}
                    </dd>
                  </div>
                </dl>

                <span className="j-text-link mt-8 self-start text-primary">
                  {upcoming ? "Preview the edit" : "Shop the sale"}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
