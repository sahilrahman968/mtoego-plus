"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  IndianRupee,
  PackageSearch,
  Tag,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { ProductCardSkeleton } from "@/components/jewellery/shared/Skeletons";
import { formatPrice, getDiscountPercent } from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import {
  fetchSale,
  trackSaleView,
  type ProductData,
  type SaleCampaignPublic,
} from "@/lib/store-api";

const SORT_OPTIONS = [
  { value: "curated", label: "Curated" },
  { value: "discount", label: "Biggest saving" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  ended: boolean;
}

function useCountdown(targetIso: string | undefined): Countdown {
  const target = targetIso ? new Date(targetIso).getTime() : 0;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const remaining = Math.max(0, target - now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    ended: remaining <= 0,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Lowest live price, highest strike-through price, and the resulting cut. */
function priceFacts(product: ProductData) {
  const active = product.variants.filter((v) => v.isActive !== false);
  if (!active.length) return { price: 0, compare: 0, discount: 0 };
  const price = Math.min(...active.map((v) => priceInclGst(v.price, v.gst)));
  const compare = Math.max(
    ...active.map((v) => (v.compareAtPrice ? priceInclGst(v.compareAtPrice, v.gst) : 0))
  );
  return { price, compare, discount: getDiscountPercent(price, compare) };
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: SaleCampaignPublic["status"] }) {
  const config = {
    live: { label: "Live now", className: "border-primary/50 bg-accent-light text-primary" },
    scheduled: { label: "Opens soon", className: "border-warning/40 bg-card text-warning" },
    ended: { label: "Sale ended", className: "border-border bg-card text-muted" },
    paused: { label: "Paused", className: "border-border bg-card text-muted" },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${config.className}`}
    >
      <span className="relative flex size-1.5" aria-hidden="true">
        {status === "live" && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70 motion-reduce:animate-none" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {config.label}
    </span>
  );
}

function CountdownTiles({ countdown, label }: { countdown: Countdown; label: string }) {
  const parts = [
    { key: "days", label: "Days", value: countdown.days },
    { key: "hours", label: "Hrs", value: countdown.hours },
    { key: "minutes", label: "Min", value: countdown.minutes },
    { key: "seconds", label: "Sec", value: countdown.seconds },
  ];

  return (
    <div
      role="timer"
      aria-label={`${label}: ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes`}
    >
      <p className="eyebrow inline-flex items-center gap-2 text-primary">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {label}
      </p>
      <div className="mt-4 flex gap-2.5" aria-hidden="true">
        {parts.map((part) => (
          <div
            key={part.key}
            className="min-w-[4.25rem] border border-border bg-card px-3 py-3 text-center sm:min-w-[5rem]"
          >
            <p className="tabular text-2xl leading-none text-foreground sm:text-3xl">
              {pad(part.value)}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {part.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UrgencyBar({
  campaign,
  countdown,
  timerLabel,
  visible,
}: {
  campaign: SaleCampaignPublic;
  countdown: Countdown;
  timerLabel: string;
  visible: boolean;
}) {
  const compact = [
    { value: countdown.days, unit: "d" },
    { value: countdown.hours, unit: "h" },
    { value: countdown.minutes, unit: "m" },
    { value: countdown.seconds, unit: "s" },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed inset-x-0 top-16 z-30 border-b border-border bg-background/95 backdrop-blur-xl lg:top-20"
        >
          <div className="j-container flex h-14 items-center justify-between gap-4">
            <p className="min-w-0 truncate text-xs uppercase tracking-[0.14em] text-foreground">
              {campaign.title}
            </p>
            <div className="flex shrink-0 items-center gap-4">
              <p className="flex items-baseline gap-1.5">
                <span className="sr-only">{timerLabel}</span>
                <span
                  className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-muted md:inline"
                  aria-hidden="true"
                >
                  {timerLabel}
                </span>
                {compact.map((part) => (
                  <span key={part.unit} className="tabular text-sm text-foreground">
                    {pad(part.value)}
                    <span className="text-[11px] text-muted">{part.unit}</span>
                  </span>
                ))}
              </p>
              <a href="#sale-products" className="j-button-primary hidden min-h-11 sm:inline-flex">
                Shop
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StatCell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 bg-background px-5 py-6 sm:px-7">
      <span className="mt-0.5 shrink-0 text-primary" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-1.5 truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SaleDetailSkeleton() {
  return (
    <div className="j-container py-12 sm:py-16">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <div className="h-4 w-28 animate-pulse bg-card-hover" />
          <div className="h-16 w-4/5 animate-pulse bg-card-hover" />
          <div className="h-4 w-full animate-pulse bg-card-hover" />
          <div className="h-24 w-72 animate-pulse bg-card-hover" />
          <div className="h-12 w-48 animate-pulse bg-card-hover" />
        </div>
        <div className="aspect-[4/5] animate-pulse bg-[#EEE9E0]" />
      </div>
      <div className="mt-16 grid grid-cols-2 gap-px border-y border-border bg-border lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-background px-5 py-6">
            <div className="h-3 w-20 animate-pulse bg-card-hover" />
            <div className="mt-2.5 h-4 w-28 animate-pulse bg-card-hover" />
          </div>
        ))}
      </div>
      <div className="mt-16 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SaleDetailClient({ slug }: { slug: string }) {
  const [campaign, setCampaign] = useState<SaleCampaignPublic | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [sort, setSort] = useState<SortValue>("curated");
  const [barVisible, setBarVisible] = useState(false);
  const heroRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSale(slug)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setCampaign(res.data.campaign);
          setProducts(res.data.products || []);
          void trackSaleView(slug);
        } else {
          setError(res.message || "Sale not found");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Sale not found");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // The urgency bar takes over once the masthead countdown scrolls out of view.
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setBarVisible(!entry.isIntersecting),
      { rootMargin: "-160px 0px 0px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [campaign]);

  const isScheduled = campaign?.status === "scheduled";
  const isEnded = campaign?.status === "ended";
  const countdown = useCountdown(
    campaign ? (isScheduled ? campaign.startsAt : campaign.endsAt) : undefined
  );

  const decorated = useMemo(
    () => products.map((product) => ({ product, ...priceFacts(product) })),
    [products]
  );

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; count: number }>();
    for (const { product } of decorated) {
      const category = product.category;
      if (!category?._id) continue;
      const entry = seen.get(category._id);
      if (entry) entry.count += 1;
      else seen.set(category._id, { id: category._id, name: category.name, count: 1 });
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [decorated]);

  const visible = useMemo(() => {
    const filtered =
      categoryId === "all"
        ? decorated
        : decorated.filter((item) => item.product.category?._id === categoryId);
    const sorted = [...filtered];
    if (sort === "discount") sorted.sort((a, b) => b.discount - a.discount);
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [decorated, categoryId, sort]);

  const maxDiscount = useMemo(
    () => decorated.reduce((max, item) => Math.max(max, item.discount), 0),
    [decorated]
  );
  const lowestPrice = useMemo(
    () =>
      decorated.reduce(
        (min, item) => (item.price > 0 ? Math.min(min, item.price) : min),
        Number.POSITIVE_INFINITY
      ),
    [decorated]
  );

  if (loading) return <SaleDetailSkeleton />;

  if (error || !campaign) {
    return (
      <div className="j-container py-24">
        <div className="mx-auto max-w-lg border border-border bg-card px-6 py-16 text-center sm:px-10">
          <span
            className="mx-auto mb-6 grid size-12 place-items-center border border-border text-muted"
            aria-hidden="true"
          >
            <TriangleAlert className="size-5" />
          </span>
          <h1 className="text-3xl">Sale unavailable</h1>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {error || "This event is not open right now."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sale" className="j-button-primary">
              All sales
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link href="/products" className="j-button-secondary">
              Browse jewellery
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const timerLabel = isScheduled
    ? countdown.ended
      ? "Opening now"
      : "Opens in"
    : countdown.ended || isEnded
      ? "Sale ended"
      : "Ends in";
  const showCountdown = (campaign.status === "live" || isScheduled) && !countdown.ended;
  const headline = campaign.homeHeadline || campaign.title;
  const banner = campaign.banner?.url ? campaign.banner : null;
  const secondaryCta =
    campaign.bannerCtaHref && campaign.bannerCtaHref !== `/sale/${campaign.slug}`
      ? { label: campaign.bannerCtaLabel || "Learn more", href: campaign.bannerCtaHref }
      : null;

  return (
    <div>
      <UrgencyBar
        campaign={campaign}
        countdown={countdown}
        timerLabel={timerLabel}
        visible={barVisible && showCountdown}
      />

      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="j-container py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.12em] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 shrink-0" />
            </li>
            <li>
              <Link href="/sale" className="transition-colors hover:text-foreground">
                Sale
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 shrink-0" />
            </li>
            <li aria-current="page" className="truncate text-foreground">
              {campaign.title}
            </li>
          </ol>
        </nav>

        <div
          className={`mt-10 grid gap-12 ${banner ? "lg:grid-cols-2 lg:items-center lg:gap-20" : ""}`}
        >
          <div className={banner ? "" : "max-w-3xl"}>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={campaign.status} />
              {campaign.badgeLabel && (
                <span className="border border-primary/40 bg-accent-light px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {campaign.badgeLabel}
                </span>
              )}
            </div>

            <h1 className="mt-7 text-4xl sm:text-5xl lg:text-6xl">{headline}</h1>

            {campaign.subtitle && (
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted">
                {campaign.subtitle}
              </p>
            )}

            {showCountdown ? (
              <div className="mt-10">
                <CountdownTiles countdown={countdown} label={timerLabel} />
              </div>
            ) : (
              <p className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-muted">
                <Clock3 className="size-3.5" aria-hidden="true" />
                {isEnded || countdown.ended
                  ? `Closed ${formatDateTime(campaign.endsAt)}`
                  : `Opens ${formatDateTime(campaign.startsAt)}`}
              </p>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <a href="#sale-products" className="j-button-primary">
                {isScheduled ? "Preview the edit" : "Shop the sale"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </a>
              {secondaryCta && (
                <Link href={secondaryCta.href} className="j-button-secondary">
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          </div>

          {banner && (
            <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE9E0]">
              <Image
                src={banner.url}
                alt={banner.alt || campaign.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className={`object-cover ${isEnded ? "grayscale" : ""}`}
              />
            </div>
          )}
        </div>
      </section>

      {/* ── Fact strip ───────────────────────────────────────────────────── */}
      <section aria-label="Sale details" className="border-y border-border">
        <div className="j-container">
          {/* A 1px gap over a tinted parent draws exact hairlines between cells
              at every breakpoint, without per-cell border bookkeeping. */}
          <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            <StatCell
              icon={<PackageSearch className="size-4" />}
              label="On sale"
              value={`${products.length} ${products.length === 1 ? "piece" : "pieces"}`}
            />
            <StatCell
              icon={<Tag className="size-4" />}
              label="Savings"
              value={maxDiscount > 0 ? `Up to ${maxDiscount}% off` : "Event pricing"}
            />
            <StatCell
              icon={<IndianRupee className="size-4" />}
              label="Starting at"
              value={Number.isFinite(lowestPrice) ? formatPrice(lowestPrice) : "—"}
            />
            <StatCell
              icon={<Ticket className="size-4" />}
              label="Coupons"
              value={campaign.allowCoupons ? "Stackable" : "Not stackable"}
            />
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────────── */}
      <section
        id="sale-products"
        className="j-container scroll-mt-36 py-14 sm:py-20 lg:scroll-mt-44"
      >
        {campaign.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">{campaign.description}</p>
        )}

        {isEnded && (
          <div className="mt-10 flex flex-col gap-5 border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div>
                <h2 className="text-lg">This sale has ended</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Prices below have returned to regular. Join us for the next event.
                </p>
              </div>
            </div>
            <Link href="/sale" className="j-button-secondary shrink-0">
              See live sales
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {isScheduled && (
          <div className="mt-10 flex items-start gap-3 border border-warning/35 bg-card p-6">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <h2 className="text-lg">Preview only</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sale pricing opens {formatDateTime(campaign.startsAt)}. Save your pieces now and
                check out the moment it begins.
              </p>
            </div>
          </div>
        )}

        {!campaign.allowCoupons && campaign.status === "live" && (
          <div className="mt-10 flex items-start gap-3 border border-border bg-card p-5">
            <Ticket className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted">
              Sale prices cannot be combined with coupon codes.
            </p>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-12 border-b border-border pb-6">
            <h2 className="sr-only">Filter and sort sale pieces</h2>

            {categories.length > 1 && (
              <div className="no-scrollbar -mx-4 mb-7 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {[{ id: "all", name: "All", count: products.length }, ...categories].map((cat) => {
                  const active = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      aria-pressed={active}
                      className={`shrink-0 cursor-pointer border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted hover:border-foreground/50 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      <span className="tabular ml-2 opacity-70">{cat.count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted" aria-live="polite">
                <span className="tabular text-foreground">{visible.length}</span>{" "}
                {visible.length === 1 ? "piece" : "pieces"}
                {categoryId !== "all" && (
                  <>
                    {" "}
                    of <span className="tabular">{products.length}</span>
                  </>
                )}
              </p>

              <div className="no-scrollbar -mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <span
                  className="mr-2 shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
                  aria-hidden="true"
                >
                  Sort
                </span>
                {SORT_OPTIONS.map((option) => {
                  const active = sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSort(option.value)}
                      aria-pressed={active}
                      aria-label={`Sort by ${option.label}`}
                      className={`relative min-h-11 shrink-0 cursor-pointer px-3 text-sm transition-colors ${
                        active ? "text-primary" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {option.label}
                      {active && <span className="absolute inset-x-3 bottom-2 h-px bg-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="mt-12 border border-border bg-card px-6 py-20 text-center">
            <span
              className="mx-auto mb-6 grid size-12 place-items-center border border-border text-muted"
              aria-hidden="true"
            >
              <PackageSearch className="size-5" />
            </span>
            <h2 className="text-2xl">
              {products.length === 0 ? "No pieces in this sale yet" : "Nothing in this category"}
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {products.length === 0
                ? "Pieces for this event will appear here as soon as they go live."
                : "Try another category, or clear the filter to see the whole edit."}
            </p>
            {products.length === 0 ? (
              <Link href="/products" className="j-button-primary mt-8">
                Browse all jewellery
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setCategoryId("all")}
                className="j-button-secondary mt-8 cursor-pointer"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
            {visible.map((item) => (
              <ProductCard
                key={item.product._id}
                product={item.product}
                // Every card sits under the same campaign, so the shared campaign
                // badge carries no information here — the saving does.
                badgeLabel={item.discount > 0 ? `-${item.discount}%` : null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
