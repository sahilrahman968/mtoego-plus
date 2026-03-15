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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-8 bg-card-hover rounded w-48 animate-pulse-slow mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-card-hover rounded-xl animate-pulse-slow" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          All Categories
        </h1>
        <p className="text-sm text-muted mt-1">
          Browse our collection of {categories.length} categories
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat._id}
              href={`/categories/${cat.slug}`}
              className="group text-center hover:shadow-md transition-all duration-300 rounded-xl overflow-hidden bg-card border border-border"
            >
              <div className="relative aspect-square bg-card-hover overflow-hidden">
                {cat.image?.url ? (
                  <Image
                    src={cat.image.url}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-card-hover">
                    <span className="text-5xl font-bold text-primary/30">
                      {cat.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                  {cat.name}
                </h2>
                {cat.description && (
                  <p className="text-xs text-muted mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1 mt-2 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Browse <ArrowRight size={12} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Grid3x3 size={40} className="mx-auto text-muted mb-3" />
          <h2 className="text-lg font-semibold text-foreground">No categories yet</h2>
          <p className="text-sm text-muted mt-1">Check back soon for new categories</p>
        </div>
      )}
    </div>
  );
}
