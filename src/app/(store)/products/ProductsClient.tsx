"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { ProductCardSkeleton } from "@/components/jewellery/shared/Skeletons";
import {
  fetchCategories,
  fetchProducts,
  type CategoryData,
  type ProductData,
} from "@/lib/store-api";

const PAGE_SIZE = 20;

/** Only `createdAt` and `price` are sortable server-side. */
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "price:asc", label: "Price: low to high" },
  { value: "price:desc", label: "Price: high to low" },
] as const;

const DEFAULT_SORT = "createdAt:desc";

function GroupHeading({ children }: { children: ReactNode }) {
  return <h3 className="eyebrow mb-3 text-muted">{children}</h3>;
}

function FilterOption({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: ReactNode;
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

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs uppercase tracking-[0.12em] text-foreground">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="cursor-pointer text-muted transition-colors hover:text-foreground"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [result, setResult] = useState<{
    key: string;
    items: ProductData[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [refineOpen, setRefineOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const sortParam = searchParams.get("sort");
  const orderParam = searchParams.get("order");
  const search = searchParams.get("search") || "";
  const featured = searchParams.get("featured") === "true";

  const sortField = sortParam === "price" || sortParam === "createdAt" ? sortParam : "";
  const sortOrder: "asc" | "desc" | undefined =
    orderParam === "asc" || orderParam === "desc" ? orderParam : undefined;
  // Both halves are required: a lone `sort` or `order` falls back to the
  // server default (newest first) rather than guessing the missing half.
  const sortValue = sortField && sortOrder ? `${sortField}:${sortOrder}` : "";
  const activeSort = sortValue || DEFAULT_SORT;

  // Deriving "loading" from the in-flight request identity avoids a setState
  // pass on every param change, and keeps the last result on screen until the
  // matching response lands.
  const requestKey = `${page}|${category}|${sortValue}|${search}|${featured}`;
  const loading = result?.key !== requestKey;
  const products = result?.items ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      if (updates.page === undefined && !("page" in updates)) {
        params.set("page", "1");
      }
      router.push(`/products?${params.toString()}`);
    },
    [searchParams, router]
  );

  useEffect(() => {
    fetchCategories(null).then((res) => {
      if (res.success && res.data) setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    if (!refineOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRefineOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [refineOpen]);

  useEffect(() => {
    let cancelled = false;
    fetchProducts({
      page,
      limit: PAGE_SIZE,
      sort: sortValue ? sortField : undefined,
      order: sortValue ? sortOrder : undefined,
      category: category || undefined,
      search: search || undefined,
      featured: featured || undefined,
    }).then((res) => {
      if (cancelled) return;
      setResult({
        key: requestKey,
        items: res.success && res.data ? res.data.items : [],
        total: res.success && res.data ? res.data.total : 0,
        totalPages: res.success && res.data ? res.data.totalPages : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [page, category, sortValue, sortField, sortOrder, search, featured, requestKey]);

  const activeCategory = category ? categories.find((c) => c._id === category)?.name : null;
  const hasChips = Boolean(activeCategory) || featured;

  const selectCategory = (value: string) => {
    updateParams({ category: value, page: "1" });
    setRefineOpen(false);
  };

  const selectSort = (value: string) => {
    const [sort, order] = value.split(":");
    updateParams({ sort, order, page: "1" });
    setRefineOpen(false);
  };

  const refineControls = (
    <>
      <div>
        <GroupHeading>Category</GroupHeading>
        <div>
          <FilterOption active={!category} onSelect={() => selectCategory("")}>
            All jewellery
          </FilterOption>
          {categories.map((cat) => (
            <FilterOption
              key={cat._id}
              active={category === cat._id}
              onSelect={() => selectCategory(cat._id)}
            >
              {cat.name}
            </FilterOption>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <GroupHeading>Sort by</GroupHeading>
        <div>
          {SORT_OPTIONS.map((option) => (
            <FilterOption
              key={option.value}
              active={activeSort === option.value}
              onSelect={() => selectSort(option.value)}
            >
              {option.label}
            </FilterOption>
          ))}
        </div>
      </div>
    </>
  );

  const grid = (
    <div className="grid grid-cols-2 gap-x-5 gap-y-12 sm:gap-x-7 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-16">
      {loading
        ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)
        : products.map((product) => <ProductCard key={product._id} product={product} />)}
    </div>
  );

  return (
    <>
      <div className="j-container py-10 sm:py-16">
        <header className="max-w-2xl">
          <p className="eyebrow text-primary">
            {search ? "Search" : featured ? "The edit" : "The collection"}
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl">
            {search ? `Results for “${search}”` : activeCategory || "All jewellery"}
          </h1>
          <p className="mt-5 text-sm text-muted" aria-live="polite">
            {loading
              ? "Loading pieces…"
              : `${total} ${total === 1 ? "piece" : "pieces"}`}
          </p>
        </header>

        {hasChips && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {activeCategory && (
              <Chip label={activeCategory} onClear={() => updateParams({ category: "" })} />
            )}
            {featured && <Chip label="Featured" onClear={() => updateParams({ featured: "" })} />}
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="cursor-pointer text-xs uppercase tracking-[0.12em] text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="mt-10 border-y border-border py-4 lg:hidden">
          <button
            type="button"
            onClick={() => setRefineOpen(true)}
            aria-expanded={refineOpen}
            className="j-button-secondary w-full cursor-pointer"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filter &amp; sort
          </button>
        </div>

        <div className="mt-12 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-16">
          <aside className="hidden lg:block" aria-labelledby="refine-heading">
            <div className="sticky top-28">
              <h2 id="refine-heading" className="eyebrow mb-8 text-foreground">
                Refine
              </h2>
              {refineControls}
            </div>
          </aside>

          <div className="min-w-0">
            {loading || products.length > 0 ? (
              <>
                {grid}

                {!loading && totalPages > 1 && (
                  <nav
                    aria-label="Pagination"
                    className="mt-16 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-10"
                  >
                    <button
                      type="button"
                      onClick={() => updateParams({ page: String(page - 1) })}
                      disabled={page <= 1}
                      className="min-h-11 cursor-pointer border border-border px-4 text-xs uppercase tracking-[0.12em] transition-colors hover:border-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        const current = pageNum === page;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => updateParams({ page: String(pageNum) })}
                            aria-label={`Page ${pageNum}`}
                            aria-current={current ? "page" : undefined}
                            className={`tabular size-11 cursor-pointer text-sm transition-colors ${
                              current
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-card-hover"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateParams({ page: String(page + 1) })}
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
                <h2 className="text-2xl">Nothing here yet</h2>
                <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted">
                  {search
                    ? `We could not find a piece matching “${search}”. Try another term or explore the full collection.`
                    : "No pieces match this selection. Adjust your filters to see more of the collection."}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="j-button-primary mt-8 cursor-pointer"
                >
                  View all jewellery
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {refineOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            onClick={() => setRefineOpen(false)}
            aria-label="Close filters"
            className="absolute inset-0 cursor-default bg-foreground/30 backdrop-blur-[2px]"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filter and sort"
            className="animate-slide-in-right absolute right-0 top-0 h-dvh w-[min(90vw,22rem)] overflow-y-auto border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="text-2xl">Filter &amp; sort</h2>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setRefineOpen(false)}
                className="j-icon-button cursor-pointer"
                aria-label="Close filters"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="px-6 py-8">{refineControls}</div>
          </aside>
        </div>
      )}
    </>
  );
}
