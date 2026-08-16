"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Package, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { ProductCardSkeleton } from "@/components/store/skeletons";
import {
  fetchProducts,
  fetchCategories,
  type ProductData,
  type CategoryData,
} from "@/lib/store-api";

const SORT_OPTIONS = [
  { value: "price:asc", label: "Low to High" },
  { value: "price:desc", label: "High to Low" },
];

function FilterOptionLabel({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span className="relative inline-block pb-1">
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-px bg-primary" />
      )}
      <motion.span
        variants={{
          rest: { scaleX: 0 },
          hover: { scaleX: 1 },
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-white"
      />
    </span>
  );
}

export default function CategoryProductsClient({ slug }: { slug: string }) {
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [result, setResult] = useState<{
    key: string;
    items: ProductData[];
    totalPages: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [sortValue, setSortValue] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const requestKey = category ? `${category._id}|${page}|${sortValue}` : "";
  const loading = result?.key !== requestKey;
  const products = result?.items ?? [];
  const totalPages = result?.totalPages ?? 0;

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success && res.data) {
        const cat = res.data.find((c) => c.slug === slug);
        setCategory(cat || null);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!filterOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [filterOpen]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;
    const [sort, order] = sortValue
      ? (sortValue.split(":") as ["price", "asc" | "desc"])
      : [undefined, undefined];
    fetchProducts({
      category: category._id,
      page,
      limit: 20,
      sort,
      order,
    }).then((res) => {
      if (cancelled) return;
      setResult({
        key: requestKey,
        items: res.success && res.data ? res.data.items : [],
        totalPages: res.success && res.data ? res.data.totalPages : 0,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [category, page, sortValue, requestKey]);

  const renderSortFilters = (mobile = false) => (
    <>
      {mobile && (
        <button
          type="button"
          onClick={() => setFilterOpen(false)}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
          aria-label="Close filters"
        >
          <X size={18} />
        </button>
      )}

      <div className={mobile ? "relative px-4 pb-6 pt-14" : ""}>
        {mobile && (
          <p className="mb-4 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-muted/70">
            Sort
          </p>
        )}

        <div>
          <h4
            className={
              mobile
                ? "mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-muted/70"
                : "mb-3 text-sm font-semibold text-foreground"
            }
          >
            Sort by Price
          </h4>
          <div className={mobile ? "" : "space-y-1"}>
            {SORT_OPTIONS.map((opt) => {
              const active = sortValue === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileFocus="hover"
                  onClick={() => {
                    setSortValue(opt.value);
                    setPage(1);
                    setFilterOpen(false);
                  }}
                  className={`block w-full text-left transition-colors ${
                    mobile
                      ? `min-h-10 px-3.5 text-sm font-medium tracking-[0.03em] ${
                          active
                            ? "text-primary"
                            : "text-foreground/85 hover:text-foreground"
                        }`
                      : `rounded px-2 py-1.5 text-sm ${
                          active
                            ? "font-medium text-primary"
                            : "text-foreground"
                        }`
                  }`}
                >
                  <FilterOptionLabel active={active}>
                    {opt.label}
                  </FilterOptionLabel>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/categories" className="hover:text-foreground">
            Categories
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground">{category?.name || slug}</span>
        </nav>

        {/* Toolbar — mobile only; desktop uses the sidebar */}
        <div className="mb-6 flex items-center border-b border-border pb-4 lg:hidden">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
          >
            <SlidersHorizontal size={16} />
            Sort
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-28">{renderSortFilters()}</div>
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10 lg:gap-14">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10 lg:gap-14">
                  {products.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                      className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted px-4">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                      className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <h2 className="text-lg font-semibold text-foreground">
                  No products in this category
                </h2>
                <p className="text-sm text-muted mt-1">
                  Check back later for new arrivals
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline"
                >
                  Browse all products
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {filterOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Close filters"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setFilterOpen(false)}
                  className="fixed inset-0 z-[2147483646] cursor-default bg-black/30 lg:hidden"
                />
                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                  className="fixed right-0 top-0 z-[2147483647] min-h-dvh w-[68vw] max-w-[17.5rem] overflow-y-auto border-b border-l border-white/10 bg-[#0d0d11]/98 shadow-[-24px_0_80px_rgba(0,0,0,0.55)] lg:hidden"
                  aria-label="Sort options"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_35%)]" />
                  {renderSortFilters(true)}
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
