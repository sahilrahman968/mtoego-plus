"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Check, ChevronRight, X } from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { ProductCardSkeleton } from "@/components/jewellery/shared/Skeletons";
import {
  fetchCategories,
  fetchProducts,
  type CategoryData,
  type ProductData,
} from "@/lib/store-api";

const PAGE_SIZE = 20;

/** An empty value keeps the server default (newest first). */
const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "price:asc", label: "Price: low to high" },
  { value: "price:desc", label: "Price: high to low" },
] as const;

function SortOption({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-b border-border/60 text-left text-sm transition-colors ${
        active ? "text-primary" : "text-foreground/80 hover:text-foreground"
      }`}
    >
      <span>{children}</span>
      {active && <Check className="size-4 shrink-0" aria-hidden="true" />}
    </button>
  );
}

export default function CategoryProductsClient({ slug }: { slug: string }) {
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [categoryMissing, setCategoryMissing] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    items: ProductData[];
    totalPages: number;
    total: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [sortValue, setSortValue] = useState("");
  const [sortOpen, setSortOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const requestKey = category ? `${category._id}|${page}|${sortValue}` : "";
  const loading = !categoryMissing && result?.key !== requestKey;
  const products = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;
  const total = result?.total ?? 0;

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success && res.data) {
        const cat = res.data.find((c) => c.slug === slug);
        setCategory(cat || null);
        setCategoryMissing(!cat);
      } else {
        setCategoryMissing(true);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!sortOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [sortOpen]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const [sort, order] = sortValue
      ? (sortValue.split(":") as ["price", "asc" | "desc"])
      : [undefined, undefined];
    fetchProducts({
      category: category._id,
      page,
      limit: PAGE_SIZE,
      sort,
      order,
    }).then((res) => {
      if (cancelled) return;
      setResult({
        key: requestKey,
        items: res.success && res.data ? res.data.items : [],
        totalPages: res.success && res.data ? res.data.totalPages : 0,
        total: res.success && res.data ? res.data.total : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [category, page, sortValue, requestKey]);

  const selectSort = (value: string) => {
    setSortValue(value);
    setPage(1);
    setSortOpen(false);
  };

  const sortControls = SORT_OPTIONS.map((option) => (
    <SortOption
      key={option.label}
      active={sortValue === option.value}
      onSelect={() => selectSort(option.value)}
    >
      {option.label}
    </SortOption>
  ));

  return (
    <>
      <div className="j-container py-10 sm:py-16">
        <nav aria-label="Breadcrumb" className="text-xs uppercase tracking-[0.12em] text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 shrink-0" />
            </li>
            <li>
              <Link href="/categories" className="transition-colors hover:text-foreground">
                Categories
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-3.5 shrink-0" />
            </li>
            <li aria-current="page" className="text-foreground">
              {category?.name || slug.replace(/-/g, " ")}
            </li>
          </ol>
        </nav>

        {categoryMissing ? (
          <div className="mt-14 border border-border bg-card px-6 py-20 text-center">
            <h1 className="text-3xl">Collection not found</h1>
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
              This collection is no longer available. Explore our other categories instead.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/categories" className="j-button-primary">
                All categories
              </Link>
              <Link href="/products" className="j-button-secondary">
                All jewellery
              </Link>
            </div>
          </div>
        ) : (
          <>
            <header className="mt-8 max-w-2xl">
              <p className="eyebrow text-primary">Collection</p>
              <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
                {category?.name || slug.replace(/-/g, " ")}
              </h1>
              {category?.description && (
                <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
                  {category.description}
                </p>
              )}
              <p className="mt-5 text-sm text-muted" aria-live="polite">
                {loading ? "Loading pieces…" : `${total} ${total === 1 ? "piece" : "pieces"}`}
              </p>
            </header>

            <div className="mt-10 border-y border-border py-4 lg:hidden">
              <button
                type="button"
                onClick={() => setSortOpen(true)}
                aria-expanded={sortOpen}
                className="j-button-secondary w-full cursor-pointer"
              >
                <ArrowUpDown className="size-4" aria-hidden="true" />
                Sort
              </button>
            </div>

            <div className="mt-12 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-16">
              <aside className="hidden lg:block" aria-labelledby="sort-heading">
                <div className="sticky top-28">
                  <h2 id="sort-heading" className="eyebrow mb-8 text-foreground">
                    Sort
                  </h2>
                  {sortControls}
                </div>
              </aside>

              <div className="min-w-0">
                {loading || products.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
                      {loading
                        ? Array.from({ length: 6 }).map((_, index) => (
                            <ProductCardSkeleton key={index} />
                          ))
                        : products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                          ))}
                    </div>

                    {!loading && totalPages > 1 && (
                      <nav
                        aria-label="Pagination"
                        className="mt-16 flex items-center justify-center gap-4 border-t border-border pt-10"
                      >
                        <button
                          type="button"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page <= 1}
                          className="min-h-11 cursor-pointer border border-border px-4 text-xs uppercase tracking-[0.12em] transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
                        >
                          Previous
                        </button>
                        <span className="tabular text-xs uppercase tracking-[0.12em] text-muted">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          disabled={page >= totalPages}
                          className="min-h-11 cursor-pointer border border-border px-4 text-xs uppercase tracking-[0.12em] transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
                        >
                          Next
                        </button>
                      </nav>
                    )}
                  </>
                ) : (
                  <div className="border border-border bg-card px-6 py-20 text-center">
                    <h2 className="text-2xl">No pieces in this collection</h2>
                    <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
                      New arrivals are added regularly. Explore the full collection in the meantime.
                    </p>
                    <Link href="/products" className="j-button-primary mt-8">
                      View all jewellery
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {sortOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            onClick={() => setSortOpen(false)}
            aria-label="Close sort options"
            className="absolute inset-0 cursor-default bg-foreground/30 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Sort options"
            className="animate-slide-in-right absolute right-0 top-0 h-dvh w-[min(90vw,22rem)] overflow-y-auto border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-2xl">Sort</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setSortOpen(false)}
                className="j-icon-button cursor-pointer"
                aria-label="Close sort options"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="px-6 py-8">{sortControls}</div>
          </aside>
        </div>
      )}
    </>
  );
}
