"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { bannerCtaPositionClass, type BannerCtaPosition } from "@/lib/banner-cta";

export interface HeroSlide {
  id: string;
  image: string;
  imageAlt: string;
  kicker?: string;
  headline?: ReactNode;
  subtitle?: string;
  href?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  ctaPosition?: BannerCtaPosition;
  extra?: ReactNode;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  compact?: boolean;
  autoPlayMs?: number;
}

export default function HeroCarousel({
  slides,
  compact = false,
  autoPlayMs = 6500,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (compact || slides.length < 2) return;
    const id = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [autoPlayMs, compact, slides.length]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, slides.length - 1));
  const slide = slides[safeActiveIndex];
  if (!slide) return null;

  const sectionSize = compact
    ? "aspect-[16/9] min-h-[16rem]"
    : "h-screen min-h-[36rem]";
  const headingSize = compact
    ? "text-3xl sm:text-4xl"
    : "text-5xl sm:text-7xl lg:text-8xl";
  const spacing = compact
    ? "px-5 pb-7 sm:px-8 sm:pb-9"
    : "px-3 pb-14 sm:px-4 sm:pb-20 lg:px-6 lg:pb-24";
  const hasText =
    Boolean(slide.kicker) || Boolean(slide.headline) || Boolean(slide.subtitle);
  const hasCopy =
    hasText ||
    Boolean(slide.primaryCta) ||
    Boolean(slide.secondaryCta) ||
    Boolean(slide.extra);

  return (
    <section
      className={`relative w-full overflow-hidden bg-black ${sectionSize}`}
      aria-roledescription={slides.length > 1 ? "carousel" : undefined}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.8 }, scale: { duration: 1.2 } }}
          className="absolute inset-0"
        >
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
            priority={safeActiveIndex === 0}
          />
        </motion.div>
      </AnimatePresence>

      {hasText ? (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.46)_42%,rgba(0,0,0,0.28)_68%,rgba(0,0,0,0.75)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-transparent to-black/40" />
        </>
      ) : slide.href && !hasCopy ? (
        <Link
          href={slide.href}
          className="absolute inset-0 z-[1]"
          aria-label={slide.imageAlt}
        />
      ) : null}

      {hasCopy ? (
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={`${slide.id}-content`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className={
            hasText
              ? `absolute inset-0 mx-auto flex h-full w-full max-w-[92rem] items-end ${spacing}`
              : bannerCtaPositionClass(slide.ctaPosition, compact)
          }
        >
          <div className={hasText ? "max-w-3xl text-left" : ""}>
            {slide.kicker ? (
              <p className="hero-kicker mb-5 text-[11px] uppercase text-primary/90 sm:text-xs">
                {slide.kicker}
              </p>
            ) : null}
            {slide.headline ? (
              <h1 className={`hero-title uppercase text-foreground ${headingSize}`}>
                {slide.headline}
              </h1>
            ) : null}
            {slide.subtitle ? (
              <p className="body-copy mt-4 max-w-2xl text-foreground/85">
                {slide.subtitle}
              </p>
            ) : null}
            {(slide.primaryCta || slide.secondaryCta) && (
              <div className={`${hasText ? (compact ? "mt-5" : "mt-9") : ""} flex flex-wrap items-center gap-3`}>
                {slide.primaryCta ? (
                  <Link
                    href={slide.primaryCta.href}
                    className="btn-text inline-flex items-center gap-2 bg-[#e32d22] px-7 py-3.5 text-white transition-colors hover:bg-[#8f0226]"
                  >
                    {slide.primaryCta.label}
                    <ArrowRight size={14} />
                  </Link>
                ) : null}
                {slide.secondaryCta ? (
                  <Link
                    href={slide.secondaryCta.href}
                    className="btn-text inline-flex items-center gap-2 border border-white/30 bg-black/35 px-7 py-3.5 text-white transition-colors hover:border-accent hover:bg-black/55"
                  >
                    {slide.secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            )}
            {slide.extra}
          </div>
        </motion.div>
      </AnimatePresence>
      ) : null}

      {!compact && slides.length > 1 ? (
        <div className="absolute bottom-5 right-3 z-10 flex items-center gap-2 sm:right-4 lg:right-6">
          {slides.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-1 transition-all duration-300 ${
                index === safeActiveIndex
                  ? "w-9 bg-primary"
                  : "w-5 bg-white/45 hover:bg-white/75"
              }`}
              aria-label={`Show slide ${index + 1}`}
              aria-current={index === safeActiveIndex}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
