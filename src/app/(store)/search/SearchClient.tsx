"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { ProductCardSkeleton } from "@/components/jewellery/shared/Skeletons";
import { fetchProducts, type ProductData } from "@/lib/store-api";

const SUGGESTIONS = [
  { href: "/products?sort=createdAt&order=desc", label: "New arrivals" },
  { href: "/products?featured=true", label: "The edit" },
  { href: "/categories", label: "Browse categories" },
];

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [result, setResult] = useState<{
    key: string;
    items: ProductData[];
    total: number;
  } | null>(null);
  // The field is seeded from `?q=` but stays editable; pinning the draft to the
  // query it belongs to lets navigation reset it without a syncing effect.
  const [draft, setDraft] = useState({ query, value: query });

  const searchInput = draft.query === query ? draft.value : query;
  const hasQuery = query.trim().length > 0;
  const loading = hasQuery && result?.key !== query;
  const products = hasQuery ? result?.items ?? [] : [];
  const total = hasQuery ? result?.total ?? 0 : 0;

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    fetchProducts({ search: query, limit: 40 }).then((res) => {
      if (cancelled) return;
      setResult({
        key: query,
        items: res.success && res.data ? res.data.items : [],
        total: res.success && res.data ? res.data.total : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="j-container py-10 sm:py-16">
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-primary">Find your piece</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">Search</h1>
      </header>

      <form onSubmit={handleSubmit} role="search" className="mx-auto mt-10 max-w-3xl">
        <label htmlFor="search-query" className="sr-only">
          Search jewellery
        </label>
        <div className="flex items-stretch border border-border bg-card">
          <span className="grid w-12 shrink-0 place-items-center text-muted" aria-hidden="true">
            <Search className="size-5" />
          </span>
          <input
            id="search-query"
            type="search"
            value={searchInput}
            onChange={(event) => setDraft({ query, value: event.target.value })}
            placeholder="Name, category or style"
            autoFocus
            className="min-w-0 flex-1 border-0 py-4 pr-2 font-display text-xl outline-none placeholder:text-muted/70 sm:text-2xl [&::-webkit-search-cancel-button]:appearance-none"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setDraft({ query, value: "" });
                router.push("/search");
              }}
              className="j-icon-button cursor-pointer self-center"
              aria-label="Clear search"
            >
              <X aria-hidden="true" />
            </button>
          )}
          <button type="submit" className="j-button-primary shrink-0 cursor-pointer px-6">
            Search
          </button>
        </div>
      </form>

      <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-7 gap-y-3">
        {SUGGESTIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-xs uppercase tracking-[0.12em] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {item.label}
          </Link>
        ))}
      </div>

      {query && (
        <div className="mt-16 border-b border-border pb-5">
          <h2 className="text-2xl sm:text-3xl">Results for “{query}”</h2>
          <p className="tabular mt-3 text-sm text-muted" aria-live="polite">
            {loading
              ? "Searching…"
              : `${total} ${total === 1 ? "piece" : "pieces"} found`}
          </p>
        </div>
      )}

      {loading ? (
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 sm:gap-x-7 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-xl border border-border bg-card px-6 py-20 text-center">
          <h2 className="text-2xl">{query ? "No matches found" : "Start your search"}</h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {query
              ? `We could not find a piece matching “${query}”. Try a different term, or browse the full collection.`
              : "Search by name, category or style, or start from one of the shortcuts above."}
          </p>
          <Link href="/products" className="j-button-primary mt-8">
            View all jewellery
          </Link>
        </div>
      )}
    </div>
  );
}
