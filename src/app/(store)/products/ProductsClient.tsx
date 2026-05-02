"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { ProductCardSkeleton } from "@/components/store/skeletons";
import {
  fetchProducts,
  fetchCategories,
  type ProductData,
  type CategoryData,
} from "@/lib/store-api";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest First" },
  { value: "createdAt:asc", label: "Oldest First" },
  { value: "price:asc", label: "Price: Low to High" },
  { value: "price:desc", label: "Price: High to Low" },
  { value: "title:asc", label: "Name: A-Z" },
  { value: "title:desc", label: "Name: Z-A" },
];

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const featured = searchParams.get("featured") || "";
  const sortParam = searchParams.get("sort") || "createdAt";
  const orderParam = searchParams.get("order") || "desc";
  const search = searchParams.get("search") || "";

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
    setLoading(true);
    fetchProducts({
      page,
      limit: 20,
      sort: sortParam,
      order: orderParam as "asc" | "desc",
      category: category || undefined,
      featured: featured === "true" || undefined,
      search: search || undefined,
    }).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
      setLoading(false);
    });
  }, [page, category, featured, sortParam, orderParam, search]);

  const activeFilters = [
    category && categories.find((c) => c._id === category)?.name,
    featured === "true" && "Featured",
  ].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {search ? `Search results for "${search}"` : "All Products"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {total} product{total !== 1 ? "s" : ""} found
        </p>
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f) => (
            <span
              key={String(f)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-light text-primary text-xs font-medium rounded-full"
            >
              {f}
              <button
                onClick={() => {
                  if (f === "Featured") updateParams({ featured: "" });
                  else updateParams({ category: "" });
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            onClick={() => router.push("/products")}
            className="text-xs text-muted hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="lg:hidden inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-muted hidden sm:block">Sort by:</label>
          <div className="relative">
            <select
              value={`${sortParam}:${orderParam}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split(":");
                updateParams({ sort, order, page: "1" });
              }}
              className="appearance-none bg-white border border-border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside
          className={`${
            filterOpen ? "fixed inset-0 z-50 bg-black/40" : "hidden"
          } lg:block lg:relative lg:bg-transparent lg:z-auto`}
        >
          <div
            className={`${
              filterOpen
                ? "fixed left-0 top-0 bottom-0 w-72 bg-white p-6 overflow-y-auto animate-slide-in-right z-50"
                : ""
            } lg:w-56 lg:shrink-0 lg:sticky lg:top-28`}
          >
            {filterOpen && (
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h3 className="font-semibold">Filters</h3>
                <button onClick={() => setFilterOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Category filter */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">Category</h4>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    updateParams({ category: "", page: "1" });
                    setFilterOpen(false);
                  }}
                  className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                    !category
                      ? "bg-primary-light text-primary font-medium"
                      : "text-foreground hover:bg-gray-50"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => {
                      updateParams({ category: cat._id, page: "1" });
                      setFilterOpen(false);
                    }}
                    className={`block w-full text-left px-2 py-1.5 text-sm rounded transition-colors ${
                      category === cat._id
                        ? "bg-primary-light text-primary font-medium"
                        : "text-foreground hover:bg-gray-50"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Featured filter */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-foreground mb-3">Quick Filters</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured === "true"}
                  onChange={(e) =>
                    updateParams({
                      featured: e.target.checked ? "true" : "",
                      page: "1",
                    })
                  }
                  className="rounded border-border text-primary focus:ring-primary/20"
                />
                <span className="text-sm text-foreground">Featured Only</span>
              </label>
            </div>
          </div>
          {filterOpen && (
            <div
              className="fixed inset-0 lg:hidden -z-10"
              onClick={() => setFilterOpen(false)}
            />
          )}
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-14">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-14">
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
                          className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
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
              <h3 className="text-lg font-semibold text-foreground">No products found</h3>
              <p className="text-sm text-muted mt-1">
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
  );
}
