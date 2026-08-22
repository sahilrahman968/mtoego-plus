"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { fetchCategories, type CategoryData } from "@/lib/store-api";
import { CategoryCardSkeleton } from "@/components/jewellery/shared/Skeletons";

export default function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data.filter((cat) => (cat.productCount ?? 0) > 0));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="j-container py-10 sm:py-16">
      <header className="max-w-2xl">
        <p className="eyebrow text-primary">Browse</p>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">Categories</h1>
        <p className="mt-5 text-sm text-muted" aria-live="polite">
          {loading
            ? "Loading categories…"
            : categories.length > 0
              ? `${categories.length} ${categories.length === 1 ? "collection" : "collections"} to explore`
              : "Our collections are being curated."}
        </p>
      </header>

      {loading ? (
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8">
          {Array.from({ length: 8 }).map((_, index) => (
            <CategoryCardSkeleton key={index} />
          ))}
        </div>
      ) : categories.length > 0 ? (
        <ul className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {categories.map((cat) => (
            <li key={cat._id}>
              <Link href={`/categories/${cat.slug}`} className="group block cursor-pointer">
                <div className="relative aspect-[4/5] overflow-hidden bg-[#EEE9E0]">
                  {cat.image?.url ? (
                    <Image
                      src={cat.image.url}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 grid place-items-center font-display text-6xl text-primary/35"
                    >
                      {cat.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl transition-colors group-hover:text-primary sm:text-2xl">
                      {cat.name}
                    </h2>
                    <p className="tabular mt-1.5 text-xs uppercase tracking-[0.12em] text-muted">
                      {cat.productCount} {cat.productCount === 1 ? "piece" : "pieces"}
                    </p>
                  </div>
                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-muted transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-14 border border-border bg-card px-6 py-20 text-center">
          <h2 className="text-2xl">No categories yet</h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            New collections are added as pieces arrive. In the meantime, browse everything we have.
          </p>
          <Link href="/products" className="j-button-primary mt-8">
            View all jewellery
          </Link>
        </div>
      )}
    </div>
  );
}
