"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Truck, Shield, RotateCcw, Sparkles } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { fetchProducts, fetchCategories, type ProductData, type CategoryData } from "@/lib/store-api";
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
  const [featuredProducts, setFeaturedProducts] = useState<ProductData[]>([]);
  const [newProducts, setNewProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [heroBanner, setHeroBanner] = useState<HeroBannerData | null>(null);
  const [heroImage, setHeroImage] = useState<HeroImageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [featuredRes, newRes, catRes, settingsRes] = await Promise.all([
          fetchProducts({ featured: true, limit: 8 }),
          fetchProducts({ sort: "createdAt", order: "desc", limit: 8 }),
          fetchCategories(null),
          fetch("/api/site-settings").then((r) => r.json()),
        ]);
        if (featuredRes.success && featuredRes.data) setFeaturedProducts(featuredRes.data.items);
        if (newRes.success && newRes.data) setNewProducts(newRes.data.items);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (settingsRes.success && settingsRes.data?.heroBanner) {
          setHeroBanner(settingsRes.data.heroBanner);
        }
        if (settingsRes.success && settingsRes.data?.heroImage) {
          setHeroImage(settingsRes.data.heroImage);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const bannerContent = heroBanner && (
    <section className="w-full">
      <div className="relative w-full aspect-[3/1] sm:aspect-[3.5/1] lg:aspect-[4/1] overflow-hidden bg-card">
        {heroBanner.type === "video" ? (
          <video
            src={heroBanner.url}
            className="w-full h-full object-cover"
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <Image
            src={heroBanner.url}
            alt={heroBanner.alt || ""}
            fill
            sizes="100vw"
            className="object-cover animate-banner-zoom"
            priority
          />
        )}
        {(heroBanner.headline || heroBanner.subheadline || heroBanner.ctaText) && (
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-white text-center px-4 animate-fade-in" style={{ animationDuration: '1.2s', animationDelay: '0.3s', animationFillMode: 'backwards' }}>
            {heroBanner.headline && (
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold drop-shadow-lg max-w-3xl">
                {heroBanner.headline}
              </h2>
            )}
            {heroBanner.subheadline && (
              <p className="mt-2 sm:mt-3 text-sm sm:text-lg text-white/90 max-w-xl drop-shadow">
                {heroBanner.subheadline}
              </p>
            )}
            {heroBanner.ctaText && heroBanner.ctaLink && (
              <Link
                href={heroBanner.ctaLink}
                className="mt-4 sm:mt-6 inline-flex items-center gap-2 px-6 py-3 bg-accent text-background font-medium rounded-full hover:bg-accent/90 transition-colors"
              >
                {heroBanner.ctaText}
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        )}
        {heroBanner.link && !heroBanner.ctaText && (
          <Link href={heroBanner.link} className="absolute inset-0" />
        )}
      </div>
    </section>
  );
  return (
    <div>
      {/* Full-width Hero Banner */}
      {bannerContent}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-card via-background to-card overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-card rounded-full text-xs font-medium text-primary border border-primary/20 mb-6">
                <Sparkles size={14} />
                New Collection Available
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Discover Your
                <span className="text-primary block">Perfect Style</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted max-w-lg leading-relaxed">
                Shop the latest trends with free shipping on orders above ₹999.
                Quality products, secure checkout, and easy returns.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors"
                >
                  Shop Now
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/categories"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-card hover:bg-card-hover text-foreground font-medium rounded-full border border-border transition-colors"
                >
                  Browse Categories
                </Link>
              </div>
            </div>
            <div className="hidden lg:block relative">
              {heroImage ? (
                <div className="w-full aspect-square max-w-lg mx-auto rounded-3xl overflow-hidden shadow-2xl">
                  <Image
                    src={heroImage.url}
                    alt={heroImage.alt || "Hero image"}
                    width={512}
                    height={512}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              ) : (
                <div className="w-full aspect-square max-w-lg mx-auto bg-gradient-to-br from-card to-card-hover rounded-3xl flex items-center justify-center">
                  <div className="text-center p-12">
                    <div className="w-32 h-32 mx-auto bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles size={48} className="text-primary" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">Premium Quality</p>
                    <p className="text-sm text-muted mt-1">Curated for you</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Shop by Category
                </h2>
                <p className="text-sm text-muted mt-1">
                  Find exactly what you&apos;re looking for
                </p>
              </div>
              <Link
                href="/categories"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat._id}
                  href={`/categories/${cat.slug}`}
                  className="group rounded-xl overflow-hidden bg-card border border-border text-center hover:shadow-md transition-all duration-300"
                >
                  <div className="relative aspect-square bg-card-hover overflow-hidden">
                    {cat.image?.url ? (
                      <Image
                        src={cat.image.url}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-card-hover">
                        <span className="text-4xl font-bold text-primary/30">
                          {cat.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12 sm:py-16 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Featured Products
              </h2>
              <p className="text-sm text-muted mt-1">Hand-picked just for you</p>
            </div>
            <Link
              href="/products?featured=true"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl border border-border overflow-hidden"
                >
                  <div className="aspect-square bg-card-hover animate-pulse-slow" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-card-hover rounded animate-pulse-slow w-1/3" />
                    <div className="h-4 bg-card-hover rounded animate-pulse-slow" />
                    <div className="h-4 bg-card-hover rounded animate-pulse-slow w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-center text-muted py-12">No featured products yet.</p>
          )}
        </div>
      </section>

      {/* Promotional Banner — only for guests */}
      {!isAuthenticated && (
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-8 sm:p-12 text-white text-center">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Get 10% Off Your First Order
              </h2>
              <p className="mt-2 text-white/80 text-sm sm:text-base max-w-md mx-auto">
                Sign up now and use code <span className="font-bold text-accent">WELCOME10</span> at checkout
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-accent text-background font-bold rounded-full hover:bg-accent/90 transition-colors"
              >
                Create Account
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newProducts.length > 0 && (
        <section className="py-12 sm:py-16 bg-card/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  New Arrivals
                </h2>
                <p className="text-sm text-muted mt-1">
                  The latest additions to our collection
                </p>
              </div>
              <Link
                href="/products?sort=createdAt&order=desc"
                className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View All <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {newProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-14 h-14 mx-auto bg-card rounded-xl flex items-center justify-center mb-3">
                <Truck size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Free Delivery</h3>
              <p className="text-sm text-muted mt-1">
                On all orders above ₹999
              </p>
            </div>
            <div>
              <div className="w-14 h-14 mx-auto bg-card rounded-xl flex items-center justify-center mb-3">
                <Shield size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Secure Payment</h3>
              <p className="text-sm text-muted mt-1">
                100% protected checkout
              </p>
            </div>
            <div>
              <div className="w-14 h-14 mx-auto bg-card rounded-xl flex items-center justify-center mb-3">
                <RotateCcw size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Easy Returns</h3>
              <p className="text-sm text-muted mt-1">
                7-day hassle-free returns
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
