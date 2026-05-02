"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, Package } from "lucide-react";
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
];

export default function CategoryProductsClient({ slug }: { slug: string }) {
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories().then((res) => {
      if (res.success && res.data) {
        const cat = res.data.find((c) => c.slug === slug);
        setCategory(cat || null);
      }
    });
  }, [slug]);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    fetchProducts({
      category: category._id,
      page,
      limit: 20,
      sort,
      order,
    }).then((res) => {
      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      }
      setLoading(false);
    });
  }, [category, page, sort, order]);

  return (
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {category?.name || slug}
          </h1>
          {category?.description && (
            <p className="text-sm text-muted mt-1">{category.description}</p>
          )}
          <p className="text-sm text-muted mt-1">
            {total} product{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative">
          <select
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s);
              setOrder(o as "asc" | "desc");
              setPage(1);
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

      {/* Products */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-14">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-10 sm:gap-14">
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
          <p className="text-sm text-muted mt-1">Check back later for new arrivals</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-primary hover:underline"
          >
            Browse all products
          </Link>
        </div>
      )}
    </div>
  );
}
