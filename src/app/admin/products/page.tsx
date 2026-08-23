"use client";

import { useEffect, useState, useCallback } from "react";
import { ImageIcon, BarChart3, Pencil, Power, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button, ButtonLink } from "../components/Button";

interface Product {
  _id: string;
  title: string;
  slug: string;
  category?: { _id: string; name: string };
  images: { url: string; alt?: string }[];
  variants: { price: number; gst?: number; stock: number; isActive: boolean }[];
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}

interface CategoryOption {
  _id: string;
  name: string;
}

type DialogMode = "delete" | "disable" | "enable";
type StatusFilter = "all" | "active" | "inactive";
type SortOption = "newest" | "oldest" | "title";

const PAGE_SIZE = 10;
const LOW_STOCK_THRESHOLD = 5;

export default function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [target, setTarget] = useState<Product | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>("delete");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Typing straight into the query would fire a text search per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data.items);
      })
      .catch((err) => console.error("Failed to fetch categories:", err));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (status !== "all") {
        params.set("isActive", status === "active" ? "true" : "false");
      }
      if (categoryFilter) params.set("category", categoryFilter);
      // "newest" is the API default (createdAt, descending) so it stays implicit.
      if (sort === "oldest") {
        params.set("sort", "createdAt");
        params.set("order", "asc");
      } else if (sort === "title") {
        params.set("sort", "title");
        params.set("order", "asc");
      }
      const res = await fetch(`/api/admin/products?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, categoryFilter, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const closeDialog = () => {
    setTarget(null);
    setDialogMode("delete");
    setErrorMessage(null);
  };

  const setProductActive = async (productId: string, isActive: boolean) => {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const json = await res.json();
    return { ok: Boolean(json.success), message: json.message as string | undefined };
  };

  const handleConfirm = async () => {
    if (!target) return;
    setActionLoading(true);
    setErrorMessage(null);
    try {
      if (dialogMode === "disable" || dialogMode === "enable") {
        const nextActive = dialogMode === "enable";
        const result = await setProductActive(target._id, nextActive);
        if (result.ok) {
          closeDialog();
          fetchProducts();
        } else {
          setErrorMessage(
            result.message ||
              (nextActive ? "Failed to enable product" : "Failed to disable product")
          );
        }
        return;
      }

      const res = await fetch(`/api/admin/products/${target._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        closeDialog();
        fetchProducts();
        return;
      }

      if (res.status === 409 && json.data?.canDisable) {
        setDialogMode("disable");
        setErrorMessage(null);
        return;
      }

      setErrorMessage(json.message || "Failed to delete product");
    } catch (err) {
      console.error("Failed to process product action:", err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const getPriceRange = (variants: Product["variants"]) => {
    const active = variants.filter((v) => v.isActive !== false);
    if (active.length === 0) return "N/A";
    const inclPrices = active.map((v) => {
      const gst = typeof v.gst === "number" ? v.gst : 18;
      return Math.round(v.price * (1 + gst / 100) * 100) / 100;
    });
    const min = Math.min(...inclPrices);
    const max = Math.max(...inclPrices);
    if (min === max) return `₹${min.toLocaleString("en-IN")}`;
    return `₹${min.toLocaleString("en-IN")} – ₹${max.toLocaleString("en-IN")}`;
  };

  const getTotalStock = (variants: Product["variants"]) =>
    variants.reduce((sum, v) => sum + v.stock, 0);

  const dialogTitle =
    dialogMode === "enable"
      ? "Enable Product"
      : dialogMode === "disable"
        ? "Disable Product"
        : "Delete Product";
  const dialogMessage =
    dialogMode === "enable"
      ? `Enable "${target?.title}"? It will appear in the store catalog again and customers can purchase it.`
      : dialogMode === "disable"
        ? `"${target?.title}" is referenced in customer carts, wishlists, or orders, so it cannot be permanently deleted. Disable it instead? Customers will see it as unavailable.`
        : `Are you sure you want to permanently delete "${target?.title}"? This action cannot be undone.`;
  const confirmLabel =
    dialogMode === "enable" ? "Enable" : dialogMode === "disable" ? "Disable" : "Delete";

  const isFiltered = Boolean(search || status !== "all" || categoryFilter);
  const rangeStart = data && data.total > 0 ? (data.page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = data ? Math.min(data.page * PAGE_SIZE, data.total) : 0;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing, and stock"
        action={{ label: "Add Product", href: "/admin/products/new" }}
      />

      <SearchFilterBar
        id="product-search"
        value={searchInput}
        label="Search products"
        placeholder="Search products…"
        onChange={setSearchInput}
      >
        <FilterSelect
          id="product-status-filter"
          label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as StatusFilter);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </FilterSelect>
        <FilterSelect
          id="product-category-filter"
          label="Filter by category"
          value={categoryFilter}
          onChange={(event) => {
            setCategoryFilter(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="product-sort"
          label="Sort products"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value as SortOption);
            setPage(1);
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A–Z</option>
        </FilterSelect>
      </SearchFilterBar>

      {loadError ? (
        <AdminErrorState
          title="Unable to load products"
          message="The product list could not be fetched. Check your connection and try again."
          onRetry={fetchProducts}
        />
      ) : (
        <>
          {data && data.total > 0 && (
            <p className="mb-2 text-xs text-admin-muted tabular" aria-live="polite">
              Showing {rangeStart}–{rangeEnd} of {data.total} product
              {data.total === 1 ? "" : "s"}
            </p>
          )}

          <DataTableShell
            label="Products"
            footer={
              data && data.totalPages > 1 ? (
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {loading ? (
              <AdminTableSkeleton rows={PAGE_SIZE} columns={5} />
            ) : !data || data.items.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching products" : "No products yet"}
                description={
                  isFiltered
                    ? "No product matches the current search and filters. Try widening them."
                    : "Get started by adding your first product to the catalog."
                }
                action={
                  !isFiltered
                    ? { label: "Add Product", href: "/admin/products/new" }
                    : undefined
                }
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/60">
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-admin-muted"
                    >
                      Product
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-right text-xs font-medium text-admin-muted"
                    >
                      Price (incl. GST)
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-right text-xs font-medium text-admin-muted sm:table-cell"
                    >
                      Stock
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-admin-muted"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-2 text-right text-xs font-medium text-admin-muted"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((product) => {
                    const stock = getTotalStock(product.variants);
                    return (
                      <tr
                        key={product._id}
                        className="transition-colors hover:bg-admin-hover"
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            {product.images[0] ? (
                              <img
                                src={product.images[0].url}
                                alt={product.images[0].alt || product.title}
                                className="size-9 shrink-0 rounded-lg bg-admin-subtle object-cover"
                              />
                            ) : (
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-admin-subtle text-admin-faint">
                                <ImageIcon aria-hidden="true" className="size-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="max-w-[16rem] truncate font-medium text-admin-heading">
                                {product.title}
                              </p>
                              <p className="max-w-[16rem] truncate text-xs text-admin-faint">
                                {product.slug}
                              </p>
                              <p className="mt-0.5 text-xs text-admin-muted md:hidden">
                                {product.category?.name || "Uncategorised"}
                                <span className="sm:hidden">
                                  {" · "}
                                  <StockLabel
                                    stock={stock}
                                    variantCount={product.variants.length}
                                    compact
                                  />
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          <span className="text-admin-muted">
                            {product.category?.name || "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right font-medium text-admin-heading price">
                          {getPriceRange(product.variants)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-right sm:table-cell">
                          <StockLabel
                            stock={stock}
                            variantCount={product.variants.length}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge
                              status={product.isActive ? "active" : "inactive"}
                            />
                            {product.isFeatured && (
                              <span className="inline-flex items-center rounded-full bg-admin-info-soft px-2 py-0.5 text-xs font-medium text-admin-info ring-1 ring-inset ring-admin-info-line">
                                Featured
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <ButtonLink
                              href={`/admin/products/${product._id}/insights`}
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              aria-label={`View insights for ${product.title}`}
                              icon={<BarChart3 aria-hidden="true" className="size-4" />}
                            >
                              <span className="hidden lg:inline">Insights</span>
                            </ButtonLink>
                            <ButtonLink
                              href={`/admin/products/${product._id}`}
                              variant="ghost"
                              size="sm"
                              className="px-2"
                              aria-label={`Edit ${product.title}`}
                              icon={<Pencil aria-hidden="true" className="size-4" />}
                            >
                              <span className="hidden lg:inline">Edit</span>
                            </ButtonLink>
                            {!product.isActive && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 text-admin-success hover:bg-admin-success-soft hover:text-admin-success"
                                aria-label={`Enable ${product.title}`}
                                title="Enable product"
                                onClick={() => {
                                  setTarget(product);
                                  setDialogMode("enable");
                                  setErrorMessage(null);
                                }}
                                icon={<Power aria-hidden="true" className="size-4" />}
                              >
                                <span className="hidden lg:inline">Enable</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-2 hover:bg-admin-danger-soft hover:text-admin-danger"
                              aria-label={`Delete ${product.title}`}
                              title="Delete product"
                              onClick={() => {
                                setTarget(product);
                                setDialogMode("delete");
                                setErrorMessage(null);
                              }}
                              icon={<Trash2 aria-hidden="true" className="size-4" />}
                            >
                              <span className="hidden lg:inline">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </DataTableShell>
        </>
      )}

      <ConfirmDialog
        open={!!target}
        title={dialogTitle}
        message={errorMessage || dialogMessage}
        confirmLabel={confirmLabel}
        variant={dialogMode === "delete" || dialogMode === "disable" ? "danger" : "default"}
        loading={actionLoading}
        onConfirm={handleConfirm}
        onCancel={closeDialog}
      />
    </div>
  );
}

/**
 * Stock reads as a health signal, so the wording carries the meaning and colour
 * only reinforces it. Inventory stays embedded in the product's variants.
 */
function StockLabel({
  stock,
  variantCount,
  compact = false,
}: {
  stock: number;
  variantCount: number;
  compact?: boolean;
}) {
  if (stock === 0) {
    return (
      <span className="font-medium text-admin-danger">
        Out of stock
      </span>
    );
  }

  const tone = stock <= LOW_STOCK_THRESHOLD ? "text-admin-warning" : "text-admin-body";
  const label = stock <= LOW_STOCK_THRESHOLD ? " in stock (low)" : " in stock";

  if (compact) {
    return (
      <span className={`font-medium ${tone}`}>
        {stock}
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end">
      <span className={`font-medium tabular ${tone}`}>
        {stock}
        <span className="sr-only">{label}</span>
      </span>
      <span className="text-xs text-admin-faint">
        {variantCount} variant{variantCount === 1 ? "" : "s"}
      </span>
    </span>
  );
}
