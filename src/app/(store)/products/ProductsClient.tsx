"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";
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

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const sortParam = searchParams.get("sort");
  const orderParam = searchParams.get("order");
  const search = searchParams.get("search") || "";

  const sortValue =
    sortParam === "price" && (orderParam === "asc" || orderParam === "desc")
      ? `price:${orderParam}`
      : "";

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
    setLoading(true);
    fetchProducts({
      page,
      limit: 20,
      sort: sortValue ? "price" : undefined,
      order: sortValue
        ? (orderParam as "asc" | "desc")
        : undefined,
      category: category || undefined,
      search: search || undefined,
    }).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotalPages(res.data.totalPages);
      }
      setLoading(false);
    });
  }, [page, category, sortValue, search]);

  const activeCategory = category
    ? categories.find((c) => c._id === category)?.name
    : null;

  const renderFilters = (mobile = false) => (
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
          <p className="eyebrow-xs mb-4 px-3 text-muted/70">
            Filters & Sort
          </p>
        )}

        <div className={mobile ? "mb-7" : "mb-6"}>
          <h4
            className={
              mobile
                ? "eyebrow-xs mb-2 px-3 text-muted/70"
                : "label-text mb-3 text-foreground"
            }
          >
            Category
          </h4>
          <div className={mobile ? "" : "space-y-1"}>
            <motion.button
              initial="rest"
              animate="rest"
              whileHover="hover"
              whileFocus="hover"
              onClick={() => {
                updateParams({ category: "", page: "1" });
                setFilterOpen(false);
              }}
              className={`block w-full text-left transition-colors ${
                mobile
                  ? `min-h-10 px-3.5 text-sm font-medium leading-snug ${
                      !category
                        ? "text-primary"
                        : "text-foreground/85 hover:text-foreground"
                    }`
                  : `rounded px-2 py-1.5 text-sm ${
                      !category
                        ? "font-medium text-primary"
                        : "text-foreground"
                    }`
              }`}
            >
              <FilterOptionLabel active={!category}>
                All Categories
              </FilterOptionLabel>
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                key={cat._id}
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileFocus="hover"
                onClick={() => {
                  updateParams({ category: cat._id, page: "1" });
                  setFilterOpen(false);
                }}
                className={`block w-full text-left transition-colors ${
                  mobile
                    ? `min-h-10 px-3.5 text-sm font-medium leading-snug ${
                        category === cat._id
                          ? "text-primary"
                          : "text-foreground/85 hover:text-foreground"
                      }`
                    : `rounded px-2 py-1.5 text-sm ${
                        category === cat._id
                          ? "font-medium text-primary"
                          : "text-foreground"
                      }`
                }`}
              >
                <FilterOptionLabel active={category === cat._id}>
                  {cat.name}
                </FilterOptionLabel>
              </motion.button>
            ))}
          </div>
        </div>

        <div className={mobile ? "border-t border-white/8 pt-5" : "mb-6"}>
          <h4
            className={
              mobile
                ? "eyebrow-xs mb-2 px-3 text-muted/70"
                : "label-text mb-3 text-foreground"
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
                    const [sort, order] = opt.value.split(":");
                    updateParams({ sort, order, page: "1" });
                    setFilterOpen(false);
                  }}
                  className={`block w-full text-left transition-colors ${
                    mobile
                      ? `min-h-10 px-3.5 text-sm font-medium leading-snug ${
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
      {search && (
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Search results for &quot;{search}&quot;
          </h1>
        </div>
      )}

      {/* Active filters */}
      {activeCategory && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="eyebrow-xs inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-primary">
            {activeCategory}
            <button onClick={() => updateParams({ category: "" })}>
              <X size={12} />
            </button>
          </span>
          <button
            onClick={() => router.push("/products")}
            className="meta-text text-muted hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Toolbar — mobile only; desktop uses the sidebar */}
      <div className="mb-6 flex items-center border-b border-border pb-4 lg:hidden">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
        >
          <SlidersHorizontal size={16} />
          Filters & Sort
        </button>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-28">{renderFilters()}</div>
        </aside>

        {/* Product Grid */}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => updateParams({ page: String(page - 1) })}
                    disabled={page <= 1}
                    className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      return (
                        <button
                          key={pageNum}
                          onClick={() => updateParams({ page: String(pageNum) })}
                          className={`tabular h-10 w-10 rounded-lg text-sm font-medium leading-none transition-colors ${
                            pageNum === page
                              ? "bg-primary text-white"
                              : "hover:bg-gray-50 text-foreground"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => updateParams({ page: String(page + 1) })}
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
              <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <SlidersHorizontal size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg text-foreground">No products found</h3>
              <p className="meta-text mx-auto mt-2 max-w-xs text-muted">
                Try adjusting your filters or search terms
              </p>
              <button
                onClick={() => router.push("/products")}
                className="mt-4 text-sm font-medium text-primary hover:underline"
              >
                Clear all filters
              </button>
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
                aria-label="Product filters and sort"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_35%)]" />
                {renderFilters(true)}
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
