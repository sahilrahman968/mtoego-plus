"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Gem,
  PhoneCall,
  ShieldCheck,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import {
  CategoryCardSkeleton,
  ProductCardSkeleton,
} from "@/components/jewellery/shared/Skeletons";
import {
  fetchCategories,
  fetchHomeSale,
  fetchProducts,
  type CategoryData,
  type ProductData,
  type SaleCampaignPublic,
} from "@/lib/store-api";
import {
  getRecentlyViewed,
  type RecentlyViewedProduct,
} from "@/lib/recently-viewed";
import { getProductImage } from "@/lib/utils";
import { theme } from "@/config/theme";

const ROW_LIMIT = 4;
const CATEGORY_LIMIT = 5;

const TRUST_POINTS: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  copy: string;
}[] = [
  {
    icon: Gem,
    title: "Considered selection",
    copy: "A focused edit rather than an endless catalogue.",
  },
  {
    icon: Truck,
    title: "Complimentary shipping",
    copy: theme.announcement.text,
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    copy: "Encrypted payment with order tracking from start to finish.",
  },
  {
    icon: PhoneCall,
    title: "Personal assistance",
    copy: "Request help choosing a piece before you place your order.",
  },
];

type CardProduct = ProductData | RecentlyViewedProduct;

/** Ticks once a second, and only while there is a live target to count towards. */
function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return useMemo(() => {
    if (target === null) return null;
    const remaining = Math.max(0, target - now);
    const seconds = Math.floor(remaining / 1000);
    return {
      ended: remaining <= 0,
      parts: [
        { label: "Days", value: Math.floor(seconds / 86400) },
        { label: "Hrs", value: Math.floor((seconds % 86400) / 3600) },
        { label: "Min", value: Math.floor((seconds % 3600) / 60) },
        { label: "Sec", value: seconds % 60 },
      ],
    };
  }, [target, now]);
}

function SectionIntro({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow text-primary">{eyebrow}</p>
        <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="body-copy mt-4 text-muted">{description}</p>
        )}
      </div>
      {href && (
        <Link href={href} className="j-text-link shrink-0 text-muted hover:text-foreground">
          {linkLabel}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function ProductRow({
  products,
  loading,
  emptyLabel,
}: {
  products: CardProduct[];
  loading?: boolean;
  emptyLabel?: string;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
        {Array.from({ length: ROW_LIMIT }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return emptyLabel ? <p className="body-copy text-muted">{emptyLabel}</p> : null;
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

function CategoryTile({
  category,
  aspect,
  sizes,
}: {
  category: CategoryData;
  aspect: string;
  sizes: string;
}) {
  const count = category.productCount ?? 0;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group relative block overflow-hidden bg-card-hover"
    >
      <div className={`relative ${aspect}`}>
        {category.image?.url ? (
          <Image
            src={category.image.url}
            alt={category.name}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-accent-light">
            <span className="font-display text-6xl text-primary/45">
              {category.name.charAt(0)}
            </span>
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/15 to-transparent"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          {count > 0 && (
            <p className="eyebrow-xs tabular text-background/75">
              {count} {count === 1 ? "piece" : "pieces"}
            </p>
          )}
          <h3 className="mt-1.5 font-display text-2xl text-background sm:text-3xl">
            {category.name}
          </h3>
        </div>
        <ArrowRight
          className="mb-1.5 size-5 shrink-0 text-background opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

export default function HomeClient() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [featured, setFeatured] = useState<ProductData[]>([]);
  const [newArrivals, setNewArrivals] = useState<ProductData[]>([]);
  const [saleCampaign, setSaleCampaign] = useState<SaleCampaignPublic | null>(null);
  const [saleProducts, setSaleProducts] = useState<ProductData[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [callbackForm, setCallbackForm] = useState({
    requirement: "",
    phone: "",
    contactHours: "",
  });
  const [callbackSending, setCallbackSending] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackError, setCallbackError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [categoryRes, featuredRes, newestRes, saleRes] = await Promise.all([
          fetchCategories(null),
          fetchProducts({ featured: true, limit: 8 }),
          fetchProducts({ sort: "createdAt", order: "desc", limit: 8 }),
          fetchHomeSale(),
        ]);
        if (cancelled) return;

        if (categoryRes.success && categoryRes.data) {
          setCategories(
            categoryRes.data
              .filter((category) => (category.productCount ?? 0) > 0)
              .slice(0, CATEGORY_LIMIT)
          );
        }

        if (featuredRes.success && featuredRes.data) {
          setFeatured(featuredRes.data.items.slice(0, ROW_LIMIT));
        }

        if (newestRes.success && newestRes.data) {
          setNewArrivals(newestRes.data.items.slice(0, ROW_LIMIT));
        }

        if (saleRes.success && saleRes.data) {
          setSaleCampaign(saleRes.data.campaign);
          setSaleProducts((saleRes.data.products || []).slice(0, ROW_LIMIT));
        } else {
          setSaleCampaign(null);
          setSaleProducts([]);
        }
      } catch {
        // The page degrades to its editorial sections when the API is unreachable.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRecentlyViewed(getRecentlyViewed().slice(0, ROW_LIMIT));
  }, []);

  const saleIsVisible =
    saleCampaign?.status === "live" || saleCampaign?.status === "scheduled";
  const saleScheduled = saleCampaign?.status === "scheduled";
  const countdown = useCountdown(
    saleCampaign && saleIsVisible
      ? new Date(saleScheduled ? saleCampaign.startsAt : saleCampaign.endsAt).getTime()
      : null
  );

  const heroProduct = featured[0] ?? newArrivals[0] ?? null;
  const heroImage = heroProduct
    ? getProductImage(heroProduct.images)
    : loading
      ? null
      : null;
  const storyProduct = featured[1] ?? newArrivals[1] ?? heroProduct;
  const storyImage =
    categories[0]?.image?.url ??
    (storyProduct ? getProductImage(storyProduct.images) : null);

  const handleCallbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCallbackError("");
    setCallbackSending(true);

    try {
      const response = await fetch("/api/callback-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(callbackForm),
      });
      const json = await response.json();

      if (!response.ok || !json?.success) {
        setCallbackError(
          json?.message || "We could not send your request. Please try again."
        );
        return;
      }

      setCallbackSent(true);
      setCallbackForm({ requirement: "", phone: "", contactHours: "" });
    } catch {
      setCallbackError("We could not send your request. Please try again.");
    } finally {
      setCallbackSending(false);
    }
  };

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="j-container grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:py-24">
          <div className="animate-fade-in">
            <p className="eyebrow text-primary">
              {theme.brand.name} — The new season
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.9rem,7vw,5rem)] leading-[0.95]">
              {theme.brand.tagline}
            </h1>
            <p className="body-copy mt-7 text-muted">{theme.brand.description}</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link href="/products" className="j-button-primary">
                Shop the collection
              </Link>
              <Link href="/categories" className="j-button-secondary">
                Browse categories
              </Link>
            </div>
            <Link
              href="/products?featured=true"
              className="j-text-link mt-10 text-muted hover:text-foreground"
            >
              See the edit
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="relative aspect-[4/5] overflow-hidden bg-card-hover sm:aspect-[5/4] lg:aspect-[4/5]">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={heroProduct ? heroProduct.title : `${theme.brand.name} jewellery`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
                className="object-cover"
              />
            ) : loading ? (
              <div className="h-full w-full animate-pulse bg-card-hover" />
            ) : (
              <div
                aria-hidden="true"
                className="h-full w-full bg-[radial-gradient(circle_at_68%_32%,rgba(161,98,7,0.26),transparent_18%),linear-gradient(145deg,#E3D4BF,#F9F5EE_55%,#CDB28E)]"
              />
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 border border-background/25 sm:inset-6"
            />
            {heroProduct && (
              <Link
                href={`/products/${heroProduct.slug}`}
                className="absolute bottom-6 left-6 max-w-[15rem] bg-background/92 px-5 py-4 backdrop-blur transition-colors hover:bg-background sm:bottom-8 sm:left-8"
              >
                <p className="eyebrow-xs text-primary">In the spotlight</p>
                <p className="mt-1.5 line-clamp-2 font-display text-lg leading-snug">
                  {heroProduct.title}
                </p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────────────────────────── */}
      {(loading || categories.length > 0) && (
        <section className="j-section border-b border-border">
          <div className="j-container">
            <SectionIntro
              eyebrow="Explore"
              title="Shop by category"
              description="From everyday pieces to the ones saved for occasions — find your place to start."
              href="/categories"
              linkLabel="All categories"
            />

            <div className="mt-12 space-y-4 sm:space-y-5">
              {loading ? (
                <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <CategoryCardSkeleton key={index} />
                  ))}
                </div>
              ) : (
                <>
                  {categories[0] && (
                    <CategoryTile
                      category={categories[0]}
                      aspect="aspect-[4/5] sm:aspect-[2/1]"
                      sizes="(max-width: 640px) 100vw, 90vw"
                    />
                  )}
                  {categories.length > 1 && (
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
                      {categories.slice(1).map((category) => (
                        <CategoryTile
                          key={category._id}
                          category={category}
                          aspect="aspect-[4/5]"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── The edit ───────────────────────────────────────────────────────── */}
      {(loading || featured.length > 0) && (
        <section className="j-section border-b border-border">
          <div className="j-container">
            <SectionIntro
              eyebrow="The edit"
              title="Pieces we keep returning to"
              description="A short list of favourites from across the collection."
              href="/products?featured=true"
            />
            <div className="mt-12">
              <ProductRow products={featured} loading={loading} />
            </div>
          </div>
        </section>
      )}

      {/* ── Live or upcoming sale ──────────────────────────────────────────── */}
      {saleCampaign && saleIsVisible && (
        <section className="j-section border-b border-border bg-card-hover">
          <div className="j-container">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow text-primary">
                  {saleCampaign.badgeLabel || "Private sale"}
                </p>
                <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">
                  {saleCampaign.homeHeadline || saleCampaign.title}
                </h2>
                {saleCampaign.subtitle && (
                  <p className="body-copy mt-4 text-muted">{saleCampaign.subtitle}</p>
                )}
              </div>

              {countdown && (
                <div>
                  <p className="eyebrow-xs mb-3 inline-flex items-center gap-1.5 text-muted">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {saleScheduled
                      ? countdown.ended
                        ? "Opening now"
                        : "Opens in"
                      : countdown.ended
                        ? "Now closed"
                        : "Closes in"}
                  </p>
                  <div className="flex gap-2.5">
                    {countdown.parts.map((part) => (
                      <div
                        key={part.label}
                        className="min-w-[3.75rem] border border-border bg-background px-3 py-2.5 text-center"
                      >
                        <p className="tabular font-display text-2xl leading-none">
                          {String(part.value).padStart(2, "0")}
                        </p>
                        <p className="eyebrow-xs mt-1.5 text-muted">{part.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {saleCampaign.banner?.url && (
              <Link
                href={saleCampaign.bannerCtaHref || `/sale/${saleCampaign.slug}`}
                className="group relative mt-12 block aspect-[16/9] overflow-hidden bg-background sm:aspect-[21/9]"
              >
                <Image
                  src={saleCampaign.banner.url}
                  alt={saleCampaign.banner.alt || saleCampaign.title}
                  fill
                  sizes="90vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
              </Link>
            )}

            {(loading || saleProducts.length > 0) && (
              <div className="mt-12">
                <ProductRow products={saleProducts} loading={loading} />
              </div>
            )}

            <div className="mt-12">
              <Link href={`/sale/${saleCampaign.slug}`} className="j-button-primary">
                {saleCampaign.bannerCtaLabel || "View the sale"}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── New arrivals ───────────────────────────────────────────────────── */}
      {(loading || newArrivals.length > 0) && (
        <section className="j-section border-b border-border">
          <div className="j-container">
            <SectionIntro
              eyebrow="Just arrived"
              title="New in this season"
              description="The most recent additions to the collection."
              href="/products?sort=createdAt&order=desc"
              linkLabel="Shop new in"
            />
            <div className="mt-12">
              <ProductRow products={newArrivals} loading={loading} />
            </div>
          </div>
        </section>
      )}

      {/* ── Recently viewed ────────────────────────────────────────────────── */}
      {recentlyViewed.length > 0 && (
        <section className="j-section border-b border-border">
          <div className="j-container">
            <SectionIntro
              eyebrow="Where you left off"
              title="Recently viewed"
              href="/products"
            />
            <div className="mt-12">
              <ProductRow products={recentlyViewed} />
            </div>
          </div>
        </section>
      )}

      {/* ── Brand story ────────────────────────────────────────────────────── */}
      <section className="j-section border-b border-border">
        <div className="j-container grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="relative aspect-[5/4] overflow-hidden bg-card-hover lg:aspect-[4/5]">
            {storyImage ? (
              <Image
                src={storyImage}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="h-full w-full bg-[radial-gradient(circle_at_35%_30%,rgba(161,98,7,0.24),transparent_22%),linear-gradient(145deg,#E9DDCB,#F8F4EC_52%,#D8C2A3)]"
              />
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-4 border border-background/25 sm:inset-6"
            />
          </div>
          <div>
            <p className="eyebrow text-primary">Our approach</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] sm:text-5xl">
              Chosen slowly, worn every day
            </h2>
            <p className="body-copy mt-6 text-muted">{theme.brand.description}</p>
            <p className="body-copy mt-4 text-muted">
              We keep the selection small on purpose. Each category is edited so
              that whatever you choose sits easily alongside the pieces you
              already own.
            </p>
            <Link
              href="/categories"
              className="j-text-link mt-9 text-foreground hover:text-primary"
            >
              Explore the collection
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust points ───────────────────────────────────────────────────── */}
      <section className="border-b border-border py-16 sm:py-20">
        <div className="j-container grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {TRUST_POINTS.map((point) => (
            <div key={point.title}>
              <point.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl">{point.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{point.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Concierge callback ─────────────────────────────────────────────── */}
      <section className="j-section bg-foreground text-background">
        <div className="j-container grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow text-background/60">Personal concierge</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] text-background sm:text-5xl">
              Prefer to be guided?
            </h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-background/70">
              Tell us what you are looking for — a gift, a size, a piece you
              cannot find — and our team will call you back at a time that suits
              you.
            </p>
            <dl className="mt-10 space-y-5 text-sm">
              <div>
                <dt className="eyebrow-xs text-background/50">Call us</dt>
                <dd className="mt-1.5 text-background/85">
                  <a href={`tel:${theme.brand.supportPhone.replace(/\s/g, "")}`}>
                    {theme.brand.supportPhone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow-xs text-background/50">Write to us</dt>
                <dd className="mt-1.5 text-background/85">
                  <a href={`mailto:${theme.brand.supportEmail}`}>
                    {theme.brand.supportEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="eyebrow-xs text-background/50">Client care hours</dt>
                <dd className="mt-1.5 text-background/85">{theme.brand.supportHours}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-background p-7 text-foreground sm:p-10">
            {callbackSent ? (
              <div className="flex min-h-[22rem] flex-col items-center justify-center text-center">
                <CheckCircle2 className="size-7 text-success" aria-hidden="true" />
                <h3 className="mt-5 font-display text-2xl">Request received</h3>
                <p className="mt-3 max-w-xs text-sm leading-7 text-muted">
                  Our client care team will call you during your preferred hours.
                </p>
                <button
                  type="button"
                  onClick={() => setCallbackSent(false)}
                  className="j-text-link mt-8 text-foreground hover:text-primary"
                >
                  Send another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleCallbackSubmit} className="space-y-6">
                <div>
                  <label htmlFor="callback-requirement" className="label-text text-muted">
                    What are you looking for?
                  </label>
                  <textarea
                    id="callback-requirement"
                    required
                    minLength={8}
                    maxLength={1200}
                    rows={4}
                    value={callbackForm.requirement}
                    onChange={(event) =>
                      setCallbackForm((previous) => ({
                        ...previous,
                        requirement: event.target.value,
                      }))
                    }
                    placeholder="A gift for an anniversary, a ring resize, a piece you saw earlier…"
                    className="j-field mt-3 resize-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="callback-phone" className="label-text text-muted">
                    Phone number
                  </label>
                  <input
                    id="callback-phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={callbackForm.phone}
                    onChange={(event) =>
                      setCallbackForm((previous) => ({
                        ...previous,
                        phone: event.target.value,
                      }))
                    }
                    placeholder={theme.brand.supportPhone}
                    className="j-field mt-3 focus:border-foreground"
                  />
                </div>
                <div>
                  <label htmlFor="callback-hours" className="label-text text-muted">
                    Preferred hours
                  </label>
                  <input
                    id="callback-hours"
                    required
                    type="text"
                    minLength={3}
                    maxLength={80}
                    value={callbackForm.contactHours}
                    onChange={(event) =>
                      setCallbackForm((previous) => ({
                        ...previous,
                        contactHours: event.target.value,
                      }))
                    }
                    placeholder="e.g. 10am - 1pm"
                    className="j-field mt-3 focus:border-foreground"
                  />
                </div>

                {callbackError && (
                  <p role="alert" className="border border-danger/35 bg-danger/10 px-4 py-3 text-sm text-danger">
                    {callbackError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={callbackSending}
                  className="j-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <PhoneCall className="size-4" aria-hidden="true" />
                  {callbackSending ? "Sending" : "Request a callback"}
                </button>
                <p className="text-xs leading-6 text-muted">
                  We use your number only to return your call about this request.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
