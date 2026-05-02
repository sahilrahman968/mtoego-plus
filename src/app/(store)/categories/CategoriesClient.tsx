"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Grid3x3 } from "lucide-react";
import { fetchCategories, type CategoryData } from "@/lib/store-api";

export default function CategoriesClient() {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success && res.data) setCategories(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[92rem] px-3 py-8 sm:px-4 lg:px-6">
        <div className="mb-8 h-10 w-56 animate-pulse-slow bg-card-hover" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse-slow bg-card-hover" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black py-8 sm:py-10">
      <div className="mx-auto w-full max-w-[92rem] px-3 sm:px-4 lg:px-6">
        <div className="mb-7">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary/90">
            01 / Categories
          </p>
          <h1 className="text-5xl font-bold uppercase leading-[0.88] tracking-[0.03em] text-foreground sm:text-6xl">
            All Categories
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Browse our collection of {categories.length} categories
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat, idx) => (
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
                      {String(12 + (idx % 4) * 7)} Pieces
                    </p>
                    <h2 className="mt-1 text-3xl font-bold uppercase leading-none tracking-[0.03em] text-foreground transition-colors group-hover:text-primary">
                      {cat.name}
                    </h2>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <ArrowRight size={18} className="text-foreground" />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <Grid3x3 size={40} className="mx-auto mb-3 text-muted/35" />
            <h2 className="text-lg font-semibold uppercase tracking-[0.08em] text-foreground">No categories yet</h2>
            <p className="mt-1 text-sm text-muted">Check back soon for new categories</p>
          </div>
        )}
      </div>
    </div>
  );
}
