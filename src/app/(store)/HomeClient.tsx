"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  PhoneCall,
  Scissors,
  Sparkles,
  X,
} from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import TabbedShowcase from "@/components/store/TabbedShowcase";
import { ProductCardSkeleton } from "@/components/store/skeletons";
import {
  fetchCategories,
  fetchProducts,
  type CategoryData,
  type ProductData,
} from "@/lib/store-api";
import { priceInclGst } from "@/lib/pricing";
import { getDiscountPercent } from "@/lib/utils";
import {
  getRecentlyViewed,
  type RecentlyViewedProduct,
} from "@/lib/recently-viewed";

const HERO_BANNER_SRC = "/images/hero-banner.jpg";

function productMaxDiscount(product: ProductData) {
  const activeVariants = product.variants.filter((v) => v.isActive !== false);
  if (!activeVariants.length) return 0;
  return Math.max(
    ...activeVariants.map((v) =>
      getDiscountPercent(
        priceInclGst(v.price, v.gst),
        v.compareAtPrice ? priceInclGst(v.compareAtPrice, v.gst) : undefined
      )
    )
  );
}

function getDropEndDate(from = new Date()) {
  const end = new Date(from);
  const day = end.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  end.setDate(end.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() <= from.getTime()) {
    end.setDate(end.getDate() + 7);
  }
  return end;
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = Math.max(0, target.getTime() - now);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, ended: remaining <= 0 };
}

function SectionHeader({
  index,
  title,
  href,
  linkLabel = "View All",
}: {
  index: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-6">
      <div>
        <p className="eyebrow mb-3 text-primary/90">{index}</p>
        <h2 className="section-title text-xl text-foreground sm:text-2xl lg:text-3xl">
          {title}
        </h2>
      </div>
      {href ? (
        <Link
          href={href}
          className="eyebrow mt-7 hidden shrink-0 items-center gap-2 text-muted transition-colors hover:text-foreground sm:inline-flex"
        >
          {linkLabel} <ArrowRight size={16} />
        </Link>
      ) : null}
    </div>
  );
}

function ProductGrid({
  products,
  loading,
  emptyLabel,
}: {
  products: ProductData[] | RecentlyViewedProduct[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [showPeekHint, setShowPeekHint] = useState(true);

  const trackClassName =
    "no-scrollbar flex gap-5 overflow-x-auto snap-x snap-mandatory pb-1 lg:grid lg:grid-cols-5 lg:gap-5 lg:overflow-visible lg:pb-0 lg:snap-none";
  // 1 full card + 0.5 peek on small screens; 2 + 0.5 from sm; 5-up grid from lg
  const itemClassName =
    "w-[calc((100%-1.25rem)/1.5)] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/2.5)] lg:w-auto";

  const updatePeekHint = () => {
    const el = trackRef.current;
    if (!el) return;
    const remaining = el.scrollWidth - el.scrollLeft - el.clientWidth;
    setShowPeekHint(remaining > 12);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updatePeekHint();
    el.addEventListener("scroll", updatePeekHint, { passive: true });
    window.addEventListener("resize", updatePeekHint);
    return () => {
      el.removeEventListener("scroll", updatePeekHint);
      window.removeEventListener("resize", updatePeekHint);
    };
  }, [products, loading]);

  const peekBlur = showPeekHint ? (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[34%] bg-gradient-to-l from-black/55 via-black/20 to-transparent backdrop-blur-[2px] [mask-image:linear-gradient(to_right,transparent,black_45%)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_45%)] sm:w-[22%] lg:hidden"
    />
  ) : null;

  if (loading) {
    return (
      <div className="relative">
        <div ref={trackRef} className={trackClassName}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={itemClassName}>
              <ProductCardSkeleton />
            </div>
          ))}
        </div>
        {peekBlur}
      </div>
    );
  }

  if (!products.length) {
    return emptyLabel ? (
      <p className="body-copy text-muted">{emptyLabel}</p>
    ) : null;
  }

  return (
    <div className="relative">
      <div ref={trackRef} className={trackClassName}>
        {products.map((product) => (
          <div key={product._id} className={itemClassName}>
            <ProductCard product={product} borderless />
          </div>
        ))}
      </div>
      {peekBlur}
    </div>
  );
}

const CATEGORY_TAB_LIMIT = 6;
const CATEGORY_PRODUCT_LIMIT = 5;
const HOME_PRODUCT_LIMIT = 5;

export default function HomeClient() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState("");
  const [categoryProducts, setCategoryProducts] = useState<
    Record<string, ProductData[]>
  >({});
  const [featured, setFeatured] = useState<ProductData[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductData[]>([]);
  const [flashDeals, setFlashDeals] = useState<ProductData[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>(
    []
  );
  const [productsLoading, setProductsLoading] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPopupMinimized, setIsPopupMinimized] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmittingCallback, setIsSubmittingCallback] = useState(false);
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [callbackError, setCallbackError] = useState("");
  const [callbackForm, setCallbackForm] = useState({
    requirement: "",
    phone: "",
    contactHours: "",
  });

  const dropEnd = useMemo(() => getDropEndDate(), []);
  const countdown = useCountdown(dropEnd);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, featuredRes, newestRes, catalogRes] = await Promise.all([
          fetchCategories(null),
          fetchProducts({ featured: true, limit: 8 }),
          fetchProducts({ sort: "createdAt", order: "desc", limit: 8 }),
          fetchProducts({ limit: 40, sort: "createdAt", order: "desc" }),
        ]);

        if (catRes.success && catRes.data) {
          const stocked = catRes.data.filter(
            (cat) => (cat.productCount ?? 0) > 0
          );
          setCategories(stocked.slice(0, CATEGORY_TAB_LIMIT));
          setActiveCategoryId((current) => current || stocked[0]?._id || "");
        }

        const featuredItems =
          featuredRes.success && featuredRes.data ? featuredRes.data.items : [];
        const newestItems =
          newestRes.success && newestRes.data ? newestRes.data.items : [];
        const catalogItems =
          catalogRes.success && catalogRes.data ? catalogRes.data.items : [];

        setFeatured(featuredItems.slice(0, HOME_PRODUCT_LIMIT));
        setNewArrivals(newestItems.slice(0, HOME_PRODUCT_LIMIT));

        const discounted = catalogItems
          .map((product) => ({ product, discount: productMaxDiscount(product) }))
          .filter((row) => row.discount > 0)
          .sort((a, b) => b.discount - a.discount)
          .map((row) => row.product);

        const flashPool =
          discounted.length > 0
            ? discounted
            : featuredItems.length > 0
              ? featuredItems
              : newestItems;
        setFlashDeals(flashPool.slice(0, HOME_PRODUCT_LIMIT));
      } catch {
        // silently fail
      } finally {
        setProductsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!activeCategoryId || categoryProducts[activeCategoryId]) return;
    let cancelled = false;
    fetchProducts({ category: activeCategoryId, limit: CATEGORY_PRODUCT_LIMIT })
      .then((res) => {
        if (cancelled) return;
        setCategoryProducts((prev) => ({
          ...prev,
          [activeCategoryId]: res.success && res.data ? res.data.items : [],
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryProducts((prev) => ({ ...prev, [activeCategoryId]: [] }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId, categoryProducts]);

  useEffect(() => {
    setRecentlyViewed(getRecentlyViewed().slice(0, HOME_PRODUCT_LIMIT));
  }, []);

  const handlePopupClose = () => {
    setIsPopupOpen(false);
    setIsPopupMinimized(true);
  };

  const handlePopupRestore = () => {
    setIsPopupMinimized(false);
    setIsPopupOpen(true);
  };

  const openCustomOrderForm = () => {
    setCallbackError("");
    setShowSuccessState(false);
    setIsFormOpen(true);
    setIsPopupMinimized(false);
    setIsPopupOpen(true);
  };

  const handleCallbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCallbackError("");
    setIsSubmittingCallback(true);

    try {
      const response = await fetch("/api/callback-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callbackForm),
      });
      const json = await response.json();

      if (!response.ok || !json?.success) {
        setCallbackError(json?.message || "Failed to send callback request. Please try again.");
        setIsSubmittingCallback(false);
        return;
      }

      setIsSubmittingCallback(false);
      setShowSuccessState(true);
      setCallbackForm({ requirement: "", phone: "", contactHours: "" });

      window.setTimeout(() => {
        setShowSuccessState(false);
        setIsFormOpen(false);
        handlePopupClose();
      }, 2300);
    } catch {
      setCallbackError("Failed to send callback request. Please try again.");
      setIsSubmittingCallback(false);
    }
  };

  const countdownParts = [
    { label: "Days", value: countdown.days },
    { label: "Hrs", value: countdown.hours },
    { label: "Min", value: countdown.minutes },
    { label: "Sec", value: countdown.seconds },
  ];

  return (
    <div>
      <section className="relative h-screen min-h-[36rem] w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          <Image
            src={HERO_BANNER_SRC}
            alt="Motorcycle hero banner"
            fill
            sizes="100vw"
            className="object-cover animate-hero-slow-zoom"
            priority
          />
        </motion.div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.28)_68%,rgba(0,0,0,0.75)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/40" />
        <div className="absolute inset-0 mx-auto flex h-full w-full max-w-[92rem] items-end px-3 pb-14 sm:px-4 sm:pb-20 lg:px-6 lg:pb-24">
          <div className="max-w-2xl text-left">
            <p className="hero-kicker mb-5 text-[11px] uppercase text-primary/90 sm:text-xs">
              Drop 07 / Stealth Series
            </p>
            <h1 className="hero-title text-5xl uppercase text-foreground sm:text-7xl lg:text-8xl">
              <span className="block">Forged For</span>
              <span className="hero-title-outline block">Street</span>
              <span className="block">Supremacy</span>
            </h1>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="btn-text inline-flex items-center gap-2 bg-[#e32d22] px-7 py-3.5 text-white transition-colors hover:bg-[#8f0226]"
              >
                Shop The Drop
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/categories"
                className="btn-text inline-flex items-center gap-2 border border-white/30 bg-black/35 px-7 py-3.5 text-white transition-colors hover:border-accent hover:bg-black/55"
              >
                All Gear
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#1A1A1D] bg-[#09090B]">
        <div className="ticker-wrap flex h-14 w-full items-center">
          <div className="ticker-track flex items-center">
            {[0, 1].map((setIdx) => (
              <div
                key={setIdx}
                className="eyebrow-xs flex min-w-max items-center gap-6 px-3 leading-none text-[#AAA7AE] sm:px-4 lg:px-6"
              >
                {[
                  "30-Day Returns",
                  "ECE 22.06 Certified",
                  "Built For The Apex",
                  "Worldwide Delivery",
                  "Race-Tested Gear",
                  "Free Shipping Over ₹999",
                ].map((item) => (
                  <div key={`${setIdx}-${item}`} className="flex items-center gap-6">
                    <span className="h-1 w-1 rounded-full bg-[#e32d22]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="bg-black py-[30px]">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <SectionHeader
              index="01 / Categories"
              title="Gear Up"
              href="/categories"
            />
            <TabbedShowcase
              tabs={categories.map((cat) => ({
                id: cat._id,
                label: cat.name,
                imageUrl: cat.image?.url,
                href: `/categories/${cat.slug}`,
              }))}
              activeTabId={activeCategoryId}
              onTabChange={(tab) => setActiveCategoryId(tab.id)}
              renderPanel={(tab) => (
                <ProductGrid
                  products={categoryProducts[tab.id] ?? []}
                  loading={!categoryProducts[tab.id]}
                  emptyLabel="No products in this category yet."
                />
              )}
            />
          </div>
        </section>
      )}

      {(productsLoading || featured.length > 0) && (
        <section className="border-t border-border/70 bg-black py-[30px]">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <SectionHeader
              index="02 / Featured"
              title="Best Sellers"
              href="/products?featured=true"
            />
            <ProductGrid products={featured} loading={productsLoading} />
            <div className="mt-6 flex justify-end sm:hidden">
              <Link
                href="/products?featured=true"
                className="eyebrow inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground"
              >
                View All <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {(productsLoading || flashDeals.length > 0) && (
        <section className="border-t border-border/70 bg-[#09090B] py-[30px]">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow mb-3 text-primary/90">03 / Limited Drop</p>
                <h2 className="section-title text-xl text-foreground sm:text-2xl lg:text-3xl">
                  Flash Cut
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow-xs inline-flex items-center gap-1.5 text-primary/90">
                  <Clock3 size={14} />
                  {countdown.ended ? "Drop reset pending" : "Ends in"}
                </span>
                <div className="flex items-center gap-2">
                  {countdownParts.map((part) => (
                    <div
                      key={part.label}
                      className="min-w-[3.5rem] border border-border/80 bg-black/60 px-2.5 py-2 text-center"
                    >
                      <p className="tabular text-lg font-bold text-foreground sm:text-xl">
                        {String(part.value).padStart(2, "0")}
                      </p>
                      <p className="eyebrow-xs mt-0.5 text-muted">{part.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <ProductGrid products={flashDeals} loading={productsLoading} />
          </div>
        </section>
      )}

      {(productsLoading || newArrivals.length > 0) && (
        <section className="border-t border-border/70 bg-black py-[30px]">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <SectionHeader index="04 / New Arrivals" title="Latest Drop" />
            <ProductGrid products={newArrivals} loading={productsLoading} />
            <div className="mt-8 flex justify-center">
              <Link
                href="/products"
                className="btn-text inline-flex items-center gap-2 border border-border/80 bg-black/40 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white"
              >
                Shop New
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {recentlyViewed.length > 0 && (
        <section className="border-t border-border/70 bg-[#09090B] py-[30px]">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <SectionHeader index="05 / Continue" title="Recently Viewed" />
            <ProductGrid products={recentlyViewed} />
          </div>
        </section>
      )}

      <section className="border-t border-border/70 bg-black py-[30px]">
        <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
          <div className="relative overflow-hidden bg-black px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <svg
                className="absolute inset-0 h-full w-full text-primary/50"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M3.5 85 Q26 79 35.5 58 T66.5 31 T98 5"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeDasharray="3 6"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <Scissors
                size={30}
                className="absolute bottom-[9%] left-0 -rotate-[24deg] text-primary/70"
              />
            </div>
            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="eyebrow mb-3 text-primary/90">06 / Custom & Bulk</p>
                <h2 className="hero-title text-4xl uppercase text-foreground sm:text-5xl lg:text-6xl">
                  <span className="block">Built To Spec.</span>
                  <span className="block text-primary">Shipped In Volume.</span>
                </h2>
                <p className="body-copy mt-4 max-w-xl text-foreground/80">
                  Need custom colours, branding, or event-volume kits? Share your
                  brief and our team will call you back in your preferred hours.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
                <button
                  type="button"
                  onClick={openCustomOrderForm}
                  className="btn-text inline-flex items-center justify-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
                >
                  <PhoneCall size={15} />
                  Request Callback
                </button>
                <div className="border border-border/70 bg-black/35 px-4 py-3">
                  <p className="label-text text-foreground">Custom builds</p>
                  <p className="meta-text mt-0.5 text-muted">
                    Colourways, patches, and fitment tweaks
                  </p>
                </div>
                <div className="border border-border/70 bg-black/35 px-4 py-3">
                  <p className="label-text text-foreground">Event bulk orders</p>
                  <p className="meta-text mt-0.5 text-muted">
                    Club rides, launches, and track days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-none fixed inset-0 z-[70]">
        {isPopupOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, x: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="pointer-events-auto absolute bottom-4 right-3 w-[min(90vw,28rem)] overflow-hidden rounded-2xl border border-primary/45 bg-[linear-gradient(135deg,rgba(8,8,12,0.97),rgba(13,13,20,0.96))] text-foreground shadow-[0_0_34px_rgba(176,3,47,0.24)] backdrop-blur md:bottom-6 md:right-6"
          >
            <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_0%,rgba(227,18,69,0.28),transparent_36%),radial-gradient(circle_at_100%_100%,rgba(179,240,255,0.16),transparent_40%)]" />
            <div className="relative">
              <div className="flex items-start justify-between border-b border-primary/30 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-primary/45 bg-primary/15 text-primary">
                    <Bot size={17} />
                  </div>
                  <div>
                    <p className="eyebrow-xs text-primary/90">Neo Commerce Signal</p>
                    <p className="mt-1.5 text-sm font-medium leading-snug text-foreground/90">
                      Need custom builds or event-volume orders?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePopupClose}
                  aria-label="Minimize callback assistant"
                  className="rounded-full border border-primary/30 bg-black/35 p-1.5 text-muted transition-colors hover:border-primary/70 hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="px-4 pb-4 pt-3">
                {!isFormOpen && !showSuccessState && (
                  <div className="space-y-4">
                    <p className="body-copy text-foreground/85">
                      We provide product customisations and also accept bulk orders for events.
                      Share your brief and our team will call you back.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCallbackError("");
                        setIsFormOpen(true);
                      }}
                      className="btn-text inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-dark"
                    >
                      <PhoneCall size={14} />
                      Request Callback
                    </button>
                  </div>
                )}

                {isFormOpen && !showSuccessState && (
                  <form onSubmit={handleCallbackSubmit} className="space-y-3">
                    <textarea
                      value={callbackForm.requirement}
                      onChange={(event) =>
                        setCallbackForm((prev) => ({ ...prev, requirement: event.target.value }))
                      }
                      required
                      rows={3}
                      placeholder="Describe your requirement (customisation / event order details)"
                      className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm outline-none transition focus:border-primary/70 focus:ring-1 focus:ring-primary/60"
                    />
                    <input
                      value={callbackForm.phone}
                      onChange={(event) =>
                        setCallbackForm((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      required
                      type="tel"
                      inputMode="tel"
                      placeholder="Phone number"
                      className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm outline-none transition focus:border-primary/70 focus:ring-1 focus:ring-primary/60"
                    />
                    <input
                      value={callbackForm.contactHours}
                      onChange={(event) =>
                        setCallbackForm((prev) => ({ ...prev, contactHours: event.target.value }))
                      }
                      required
                      type="text"
                      placeholder="Preferred contact hours (e.g. 10am - 1pm)"
                      className="w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm outline-none transition focus:border-primary/70 focus:ring-1 focus:ring-primary/60"
                    />
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCallbackError("");
                          setIsFormOpen(false);
                        }}
                        className="btn-text text-muted transition-colors hover:text-foreground"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCallback}
                        className="btn-text inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmittingCallback ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/80 border-r-transparent" />
                            Sending
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Submit
                          </>
                        )}
                      </button>
                    </div>
                    {callbackError && (
                      <p className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-2 text-xs text-danger">
                        {callbackError}
                      </p>
                    )}
                  </form>
                )}

                {showSuccessState && (
                  <div className="relative overflow-hidden rounded-xl border border-success/40 bg-success/10 px-4 py-6 text-center">
                    <motion.div
                      initial={{ scale: 0.55, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35 }}
                      className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full border border-success/50 bg-success/20 text-success"
                    >
                      <CheckCircle2 size={22} />
                    </motion.div>
                    <p className="label-text text-success">Callback Requested</p>
                    <p className="meta-text mt-1.5 text-foreground/80">
                      Our team will connect with you in your preferred hours.
                    </p>
                    <span className="pointer-events-none absolute left-1/4 top-1/4 h-1.5 w-1.5 animate-ping rounded-full bg-success/80" />
                    <span className="pointer-events-none absolute right-1/4 top-1/3 h-1.5 w-1.5 animate-ping rounded-full bg-primary/80 [animation-delay:0.25s]" />
                    <span className="pointer-events-none absolute bottom-1/4 left-1/2 h-1.5 w-1.5 animate-ping rounded-full bg-foreground/80 [animation-delay:0.38s]" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {isPopupMinimized && !isPopupOpen && (
          <motion.button
            type="button"
            onClick={handlePopupRestore}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ x: -3 }}
            className="eyebrow-xs pointer-events-auto absolute bottom-5 right-0 inline-flex items-center gap-2 rounded-l-full border border-r-0 border-primary/50 bg-[linear-gradient(120deg,rgba(11,11,18,0.98),rgba(27,9,15,0.95))] px-3.5 py-2.5 text-foreground shadow-[0_0_22px_rgba(176,3,47,0.25)]"
          >
            <PhoneCall size={13} className="text-primary" />
            <span>Callback</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
