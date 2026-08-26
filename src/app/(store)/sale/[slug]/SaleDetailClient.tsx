"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  Flame,
  PackageSearch,
  Tag,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { ProductCardSkeleton } from "@/components/store/skeletons";
import { formatPrice, getDiscountPercent } from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import {
  fetchSale,
  trackSaleView,
  type ProductData,
  type SaleCampaignPublic,
} from "@/lib/store-api";

const CONTAINER = "mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6";
/** Matches the sticky store header height so the urgency bar docks beneath it. */
const HEADER_HEIGHT = "4rem";

const SORT_OPTIONS = [
  { value: "curated", label: "Curated" },
  { value: "discount", label: "Biggest cut" },
  { value: "price-asc", label: "Price low" },
  { value: "price-desc", label: "Price high" },
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
    setNow(Date.now());
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
    live: { label: "Live now", className: "border-primary/60 bg-primary/15 text-primary" },
    scheduled: { label: "Starts soon", className: "border-warning/50 bg-warning/12 text-warning" },
    ended: { label: "Sale ended", className: "border-white/15 bg-white/5 text-muted" },
    paused: { label: "Paused", className: "border-white/15 bg-white/5 text-muted" },
  }[status];

  return (
    <span
      className={`eyebrow-xs inline-flex items-center gap-2 border px-3 py-1.5 ${config.className}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === "live" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-70 motion-reduce:animate-none" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
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
    <div role="timer" aria-label={`${label} ${countdown.days} days ${countdown.hours} hours`}>
      <p className="eyebrow-xs mb-3 inline-flex items-center gap-1.5 text-primary">
        <Clock3 size={13} />
        {label}
      </p>
      <div className="flex items-stretch gap-1.5 sm:gap-2" aria-hidden="true">
        {parts.map((part, index) => (
          <div key={part.key} className="flex items-stretch gap-1.5 sm:gap-2">
            <div className="min-w-[4rem] border border-white/12 bg-black/55 px-3 py-2.5 text-center backdrop-blur-sm sm:min-w-[5rem] sm:py-3">
              <p
                className={`tabular text-2xl font-bold leading-none sm:text-3xl ${
                  part.key === "seconds" ? "text-primary" : "text-foreground"
                }`}
              >
                {pad(part.value)}
              </p>
              <p className="eyebrow-xs mt-1.5 text-muted">{part.label}</p>
            </div>
            {index < parts.length - 1 && (
              <span className="self-center text-lg font-bold leading-none text-white/20">:</span>
            )}
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
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          style={{ top: HEADER_HEIGHT }}
          className="fixed inset-x-0 z-40 border-y border-white/10 bg-[#09090B]/90 backdrop-blur-md"
        >
          <div
            className={`${CONTAINER} flex h-14 items-center justify-between gap-4`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="eyebrow-xs hidden shrink-0 bg-primary px-2 py-1 text-white sm:inline-block">
                {campaign.badgeLabel}
              </span>
              <p className="label-text truncate text-foreground">{campaign.title}</p>
            </div>

            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <div className="flex items-baseline gap-1.5">
                <span className="eyebrow-xs hidden text-muted md:inline">{timerLabel}</span>
                {compact.map((part) => (
                  <span key={part.unit} className="tabular text-sm font-bold text-foreground">
                    {pad(part.value)}
                    <span className="text-[0.6875rem] font-semibold text-muted">{part.unit}</span>
                  </span>
                ))}
              </div>
              <a
                href="#sale-products"
                className="btn-text hidden items-center gap-2 bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-dark sm:inline-flex"
              >
                Shop
                <ArrowRight size={13} />
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
    <div className="flex items-start gap-3 bg-[#09090B] px-4 py-5 sm:px-6">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div className="min-w-0">
        <p className="eyebrow-xs text-muted">{label}</p>
        <p className="mt-1 truncate text-sm font-bold uppercase text-foreground">{value}</p>
      </div>
    </div>
  );
}

function SaleDetailSkeleton() {
  return (
    <div>
      <div className="relative min-h-[30rem] animate-pulse-slow bg-card/60 lg:min-h-[36rem]" />
      <div className="border-y border-border/60 bg-black/40">
        <div className={`${CONTAINER} grid grid-cols-2 lg:grid-cols-4`}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-5 sm:px-6">
              <div className="h-3 w-20 animate-pulse-slow bg-card-hover" />
              <div className="mt-2 h-4 w-28 animate-pulse-slow bg-card-hover" />
            </div>
          ))}
        </div>
      </div>
      <div className={`${CONTAINER} py-10 lg:py-14`}>
        <div className="mb-8 h-4 w-40 animate-pulse-slow bg-card-hover" />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
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
      <div className={`${CONTAINER} py-24`}>
        <div className="mx-auto max-w-lg border border-border/70 bg-black/40 p-8 text-center sm:p-10">
          <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-border/80 text-muted">
            <TriangleAlert size={20} />
          </span>
          <h1 className="section-title text-2xl text-foreground">Sale unavailable</h1>
          <p className="body-copy mx-auto mt-3 text-muted">
            {error || "This campaign is not live right now."}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sale"
              className="btn-text inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
            >
              All sales
              <ArrowRight size={13} />
            </Link>
            <Link
              href="/products"
              className="btn-text inline-flex items-center gap-2 border border-border/80 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Browse gear
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const timerLabel = isScheduled
    ? countdown.ended
      ? "Starting now"
      : "Starts in"
    : countdown.ended || isEnded
      ? "Sale ended"
      : "Ends in";
  const showCountdown = (campaign.status === "live" || isScheduled) && !countdown.ended;
  const banner = campaign.banner?.url ? campaign.banner : null;

  return (
    <div>
      <UrgencyBar
        campaign={campaign}
        countdown={countdown}
        timerLabel={timerLabel}
        visible={barVisible && showCountdown}
      />

      {/* ── Masthead ─────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative isolate flex min-h-[32rem] flex-col overflow-hidden bg-black lg:min-h-[40rem]"
      >
        <div className="absolute inset-0 -z-10">
          {banner ? (
            <>
              <Image
                src={banner.url}
                alt={banner.alt || campaign.title}
                fill
                priority
                sizes="100vw"
                className={`object-cover ${
                  isEnded ? "grayscale" : "animate-hero-slow-zoom motion-reduce:animate-none"
                }`}
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.32)_72%,rgba(0,0,0,0.72)_100%)]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/55" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-[#0A0A0D]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,color-mix(in_srgb,var(--primary)_40%,transparent),transparent_58%)]" />
              <div className="absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(115deg,#fff_0_1px,transparent_1px_14px)]" />
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <nav className={`${CONTAINER} eyebrow-xs flex items-center gap-2 pt-[5.75rem] text-white/60`}>
          <Link href="/" className="transition-colors hover:text-white">
            Home
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <Link href="/sale" className="transition-colors hover:text-white">
            Sale
          </Link>
          <ChevronRight size={12} className="shrink-0" />
          <span className="truncate text-white/90">{campaign.title}</span>
        </nav>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={`${CONTAINER} mt-auto pb-12 pt-14 lg:pb-16`}
        >
          <div className="max-w-3xl">
            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <StatusPill status={campaign.status} />
              {campaign.badgeLabel && (
                <span className="eyebrow-xs inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-white">
                  <Flame size={12} />
                  {campaign.badgeLabel}
                </span>
              )}
            </div>

            {!banner && (
              <>
                <h1 className="hero-title text-4xl uppercase text-foreground sm:text-6xl lg:text-7xl">
                  {campaign.title}
                </h1>

                {campaign.subtitle && (
                  <p className="body-copy mt-5 text-foreground/80">{campaign.subtitle}</p>
                )}
              </>
            )}

            {banner && <h1 className="sr-only">{campaign.title}</h1>}

            {showCountdown ? (
              <div className="mt-9">
                <CountdownTiles countdown={countdown} label={timerLabel} />
              </div>
            ) : (
              <p className="eyebrow mt-8 inline-flex items-center gap-2 text-muted">
                <Clock3 size={14} />
                {isEnded || countdown.ended
                  ? `Closed ${formatDateTime(campaign.endsAt)}`
                  : `Starts ${formatDateTime(campaign.startsAt)}`}
              </p>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href="#sale-products"
                className="btn-text inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-white transition-colors hover:bg-primary-dark"
              >
                {isScheduled ? "Preview the drop" : "Shop the sale"}
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Fact strip ───────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-[#09090B]">
        <div className={CONTAINER}>
          {/* A 1px gap over a tinted parent draws exact hairlines between cells
              at every breakpoint, without per-cell border bookkeeping. */}
          <div className="grid grid-cols-2 gap-px bg-border/60 lg:grid-cols-4">
            <StatCell
              icon={<PackageSearch size={16} />}
              label="On sale"
              value={`${products.length} ${products.length === 1 ? "product" : "products"}`}
            />
            <StatCell
              icon={<Tag size={16} />}
              label="Savings"
              value={maxDiscount > 0 ? `Up to ${maxDiscount}% off` : "Campaign pricing"}
            />
            <StatCell
              icon={<Flame size={16} />}
              label="Starting at"
              value={Number.isFinite(lowestPrice) ? formatPrice(lowestPrice) : "—"}
            />
            <StatCell
              icon={<Ticket size={16} />}
              label="Coupons"
              value={campaign.allowCoupons ? "Stackable" : "Not stackable"}
            />
          </div>
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────────── */}
      <section id="sale-products" className={`${CONTAINER} scroll-mt-32 py-10 lg:py-14`}>
        {campaign.description && (
          <p className="body-copy mb-9 text-muted">{campaign.description}</p>
        )}

        {isEnded && (
          <div className="mb-9 flex flex-col gap-4 border border-border/70 bg-black/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <TriangleAlert size={18} className="mt-0.5 shrink-0 text-muted" />
              <div>
                <p className="label-text text-foreground">This sale has ended</p>
                <p className="meta-text mt-1 text-muted">
                  Prices below have returned to regular. Catch the next drop early.
                </p>
              </div>
            </div>
            <Link
              href="/sale"
              className="btn-text inline-flex shrink-0 items-center gap-2 border border-border/80 px-5 py-3 text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              See live sales
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {isScheduled && (
          <div className="mb-9 flex items-start gap-3 border border-warning/30 bg-warning/[0.06] p-5">
            <Clock3 size={18} className="mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="label-text text-foreground">Preview only</p>
              <p className="meta-text mt-1 text-muted">
                Sale pricing goes live {formatDateTime(campaign.startsAt)}. Wishlist now, check out
                the moment it drops.
              </p>
            </div>
          </div>
        )}

        {!campaign.allowCoupons && campaign.status === "live" && (
          <div className="mb-9 flex items-start gap-3 border border-border/70 bg-black/30 p-4">
            <Ticket size={16} className="mt-0.5 shrink-0 text-primary" />
            <p className="meta-text text-muted">
              Sale prices cannot be combined with coupon codes.
            </p>
          </div>
        )}

        {products.length > 0 && (
          <div className="mb-8 border-b border-border/60 pb-5">
            {categories.length > 1 && (
              <div className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
                {[{ id: "all", name: "All", count: products.length }, ...categories].map((cat) => {
                  const active = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      aria-pressed={active}
                      className={`eyebrow-xs shrink-0 border px-3.5 py-2 transition-colors ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border/70 text-muted hover:border-foreground/40 hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      <span className={`tabular ml-2 ${active ? "text-white/70" : "text-muted/70"}`}>
                        {cat.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="eyebrow-xs text-muted">
                <span className="tabular text-foreground">{visible.length}</span>{" "}
                {visible.length === 1 ? "item" : "items"}
                {categoryId !== "all" && (
                  <>
                    {" "}
                    of <span className="tabular">{products.length}</span>
                  </>
                )}
              </p>

              <div className="no-scrollbar flex items-center gap-1 overflow-x-auto">
                <span className="eyebrow-xs mr-2 shrink-0 text-muted/70">Sort</span>
                {SORT_OPTIONS.map((option) => {
                  const active = sort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSort(option.value)}
                      aria-pressed={active}
                      className={`relative shrink-0 px-2.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                        active ? "text-primary" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {option.label}
                      {active && (
                        <span className="absolute inset-x-2.5 bottom-0.5 h-px bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <div className="border border-border/70 bg-black/30 px-6 py-20 text-center">
            <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-border/80 text-muted">
              <PackageSearch size={20} />
            </span>
            <h2 className="section-title text-lg text-foreground">
              {products.length === 0 ? "No products in this sale yet" : "Nothing in this category"}
            </h2>
            <p className="meta-text mx-auto mt-2 max-w-sm text-muted">
              {products.length === 0
                ? "Products for this campaign will appear here as soon as they go live."
                : "Try another category or clear the filter to see the full drop."}
            </p>
            {products.length === 0 ? (
              <Link
                href="/products"
                className="btn-text mt-6 inline-flex items-center gap-2 border border-border/80 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Browse all gear
                <ArrowRight size={13} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setCategoryId("all")}
                className="btn-text mt-6 inline-flex items-center gap-2 border border-border/80 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((item) => (
              <ProductCard
                key={item.product._id}
                product={item.product}
                // Every card sits under the same campaign, so the shared campaign
                // badge carries no information here — the cut does.
                badgeLabel={item.discount > 0 ? `-${item.discount}%` : null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
