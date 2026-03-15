"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { fetchProducts, type ProductData } from "@/lib/store-api";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<ProductData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(query);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const res = await fetchProducts({ search: q, limit: 40 });
    if (res.success && res.data) {
      setProducts(res.data.items);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSearchInput(query);
    doSearch(query);
  }, [query, doSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Search form */}
      <div className="max-w-2xl mx-auto mb-8">
        <form onSubmit={handleSubmit} className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search for products..."
            className="w-full pl-12 pr-12 py-4 text-base bg-gray-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            autoFocus
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                router.push("/search");
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      {/* Results */}
      {query && (
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Results for &ldquo;{query}&rdquo;
          </h1>
          <p className="text-sm text-muted mt-1">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border overflow-hidden"
            >
              <div className="aspect-square bg-gray-100 animate-pulse-slow" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse-slow w-1/3" />
                <div className="h-4 bg-gray-100 rounded animate-pulse-slow" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      ) : query ? (
        <div className="text-center py-20">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-foreground">No results found</h2>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            We couldn&apos;t find any products matching &ldquo;{query}&rdquo;. Try
            different keywords or browse our categories.
          </p>
        </div>
      ) : (
        <div className="text-center py-20">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-foreground">
            Search for products
          </h2>
          <p className="text-sm text-muted mt-1">
            Type in the search bar above to find products
          </p>
        </div>
      )}
    </div>
  );
}
