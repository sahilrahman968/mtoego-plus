"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { fetchCategories, fetchProducts, type CategoryData, type ProductData } from "@/lib/store-api";
import { useAuth } from "@/contexts/AuthContext";

interface HeroBannerData {
  type: "image" | "video";
  url: string;
  alt?: string;
  link?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
}

interface HeroImageData {
  url: string;
  alt?: string;
}

export default function HomeClient() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductData[]>([]);
  const [heroBanner, setHeroBanner] = useState<HeroBannerData | null>(null);
  const [heroImage, setHeroImage] = useState<HeroImageData | null>(null);
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

  useEffect(() => {
    async function load() {
      try {
        const [catRes, featuredRes, settingsRes] = await Promise.all([
          fetchCategories(null),
          fetchProducts({ featured: true, limit: 4 }),
          fetch("/api/site-settings").then((r) => r.json()),
        ]);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (featuredRes.success && featuredRes.data) setFeaturedProducts(featuredRes.data.items);
        if (settingsRes.success && settingsRes.data?.heroBanner) {
          setHeroBanner(settingsRes.data.heroBanner);
        }
        if (settingsRes.success && settingsRes.data?.heroImage) {
          setHeroImage(settingsRes.data.heroImage);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  useEffect(() => {
    const popupTimer = window.setTimeout(() => {
      setIsPopupOpen(true);
      setIsPopupMinimized(false);
    }, 1000);

    return () => window.clearTimeout(popupTimer);
  }, []);

  const heroMediaUrl = heroBanner?.url || heroImage?.url || null;
  const heroMediaType = heroBanner?.type || "image";
  const heroMediaAlt = heroBanner?.alt || heroImage?.alt || "Hero image";

  const handlePopupClose = () => {
    setIsPopupOpen(false);
    setIsPopupMinimized(true);
  };

  const handlePopupRestore = () => {
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

  return (
    <div className="pb-8">
      <section className="relative h-screen min-h-[36rem] w-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {heroMediaUrl ? (
            heroMediaType === "video" ? (
              <video
                src={heroMediaUrl}
                className="h-full w-full object-cover animate-hero-slow-zoom"
                muted
                autoPlay
                loop
                playsInline
              />
            ) : (
              <Image
                src={heroMediaUrl}
                alt={heroMediaAlt}
                fill
                sizes="100vw"
                className="object-cover animate-hero-slow-zoom"
                priority
              />
            )
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-black via-card to-card-hover" />
          )}
        </motion.div>

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.28)_68%,rgba(0,0,0,0.75)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/40" />
        <div className="absolute inset-0 mx-auto flex h-full w-full max-w-[92rem] items-end px-3 pb-14 sm:px-4 sm:pb-20 lg:px-6 lg:pb-24">
          <div className="max-w-2xl text-left">
            <p className="hero-kicker mb-4 text-[10px] font-semibold uppercase text-primary/90 sm:text-xs">
              Drop 07 / Stealth Series
            </p>
            <h1 className="hero-title text-5xl uppercase tracking-[0.01em] leading-[0.98] text-foreground sm:text-7xl lg:text-8xl">
              <span className="block">Forged For</span>
              <span className="hero-title-outline block">Street</span>
              <span className="block">Supremacy</span>
            </h1>
            <p className="mt-5 hidden max-w-xl text-sm leading-relaxed text-foreground/72 sm:block sm:text-[1.1rem]">
              Race-bred gear and accessories built for speed, protection, and unmistakable street presence.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-[#e32d22] px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#8f0226]"
              >
                Shop The Drop
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/categories"
                className="inline-flex items-center gap-2 border border-white/30 bg-black/35 px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-white transition-colors hover:border-accent hover:bg-black/55"
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
                className="flex min-w-max items-center gap-6 px-3 text-[9px] font-medium leading-none uppercase tracking-[0.32em] text-[#AAA7AE] sm:px-4 lg:px-6"
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
        <section className="bg-black py-16 sm:py-20">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <div className="mb-7 flex items-start justify-between">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/90">
                  01 / Categories
                </p>
                <h2 className="text-5xl font-bold uppercase leading-[0.88] tracking-[0.03em] text-foreground sm:text-6xl">
                  Gear Up
                </h2>
              </div>
              <Link
                href="/categories"
                className="mt-6 hidden items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-muted transition-colors hover:text-foreground sm:inline-flex"
              >
                View All <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 4).map((cat, idx) => (
                <div key={cat._id}>
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="group relative block overflow-hidden bg-black focus:outline-none"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-black/55">
                      {cat.image?.url ? (
                        <Image
                          src={cat.image.url}
                          alt={cat.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-black">
                          <span className="text-5xl font-bold text-primary/60">
                            {cat.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/42 to-transparent" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/85">
                        {String(12 + idx * 7)} Pieces
                      </p>
                      <h3 className="mt-1 text-3xl font-bold uppercase leading-none tracking-[0.03em] text-foreground transition-colors group-hover:text-primary">
                        {cat.name}
                      </h3>
                    </div>
                    <div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <ArrowRight size={18} className="text-foreground" />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredProducts.length > 0 && (
        <section className="bg-black py-12 sm:py-16">
          <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
            <div className="mb-7">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/90">
                02 / Drop
              </p>
              <h2 className="text-5xl font-bold uppercase leading-[0.88] tracking-[0.03em] text-foreground sm:text-6xl">
                The Lineup
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-14 lg:grid-cols-4">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-border/70 bg-black py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-[92rem] items-center gap-8 px-3 sm:px-4 lg:grid-cols-[1fr_1.2fr] lg:gap-12 lg:px-6">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/90">
              03 / Manifesto
            </p>
            <h2 className="hero-title text-5xl uppercase text-foreground sm:text-6xl lg:text-7xl">
              <span className="block">Built For The</span>
              <span className="block text-primary">Moment</span>
              <span className="block">Between Rides.</span>
            </h2>
          </div>

          <div className="pt-1">
            <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
              We don&apos;t make commodity gear. Every helmet is laid up by hand. Every jacket is cut
              from fullgrain leather and fitted with CE Level 2 armor. Every glove is stitched to
              take a slide.
            </p>
            <p className="mt-4 max-w-2xl border-t border-border/60 pt-4 text-sm leading-relaxed text-muted sm:text-base">
              If you&apos;ve ever felt the world go quiet at 9000 RPM, you already know why we exist.
            </p>
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { icon: Truck, label: "Free Shipping", sublabel: "On orders above ₹999" },
                { icon: ShieldCheck, label: "Secure Payment", sublabel: "100% secure checkout" },
                { icon: RotateCcw, label: "Easy Returns", sublabel: "7-day return policy" },
                { icon: Zap, label: "Multiple Payment", sublabel: "UPI, Cards, Net Banking" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 bg-card/40 px-4 py-3"
                >
                  <div className="flex h-7 w-7 items-center justify-center border border-primary/35 bg-primary/10 text-primary">
                    <item.icon size={14} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
                      {item.label}
                    </p>
                    <p className="text-[10px] text-muted">{item.sublabel}</p>
                  </div>
                </div>
              ))}
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/90">
                      Neo Commerce Signal
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground/90">
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
                    <p className="text-sm leading-relaxed text-foreground/85">
                      We provide product customisations and also accept bulk orders for events.
                      Share your brief and our team will call you back.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCallbackError("");
                        setIsFormOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-primary-dark"
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
                        className="text-xs font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-foreground"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCallback}
                        className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-70"
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
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-success">
                      Callback Requested
                    </p>
                    <p className="mt-1 text-xs text-foreground/80">
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
            className="pointer-events-auto absolute bottom-5 right-0 inline-flex items-center gap-2 rounded-l-full border border-r-0 border-primary/50 bg-[linear-gradient(120deg,rgba(11,11,18,0.98),rgba(27,9,15,0.95))] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground shadow-[0_0_22px_rgba(176,3,47,0.25)]"
          >
            <PhoneCall size={13} className="text-primary" />
            <span>Callback</span>
          </motion.button>
        )}
      </div>

    </div>
  );
}
