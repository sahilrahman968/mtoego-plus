"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ConfirmDialog from "../components/ConfirmDialog";
import DataTableShell from "../components/DataTableShell";
import SearchFilterBar, { FilterSelect } from "../components/SearchFilterBar";
import { AdminErrorState, AdminTableSkeleton } from "../components/FeedbackState";
import { Button, ButtonLink } from "../components/Button";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string } | null;
  parent?: { _id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
}

interface PaginatedResponse {
  items: Category[];
  total: number;
  page: number;
  totalPages: number;
}

type ParentFilter = "all" | "root";

const PAGE_SIZE = 15;
// The list endpoint sorts by name and ignores a search term, so an active query
// pulls one wide page and narrows it in the client instead of paging blindly.
const SEARCH_PAGE_SIZE = 100;

export default function CategoriesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [parentFilter, setParentFilter] = useState<ParentFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const searching = Boolean(search);
      const params = new URLSearchParams({
        page: searching ? "1" : String(page),
        limit: String(searching ? SEARCH_PAGE_SIZE : PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (parentFilter === "root") params.set("parent", "null");
      const res = await fetch(`/api/admin/categories?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setLoadError(true);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, parentFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const visibleItems = useMemo(() => {
    if (!data) return [];
    if (!search) return data.items;
    const query = search.toLowerCase();
    return data.items.filter((category) =>
      [category.name, category.slug, category.description ?? ""].some((field) =>
        field.toLowerCase().includes(query)
      )
    );
  }, [data, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchCategories();
      } else {
        setDeleteError(json.message || "Failed to delete category");
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteError(null);
  };

  const isFiltered = Boolean(search || parentFilter !== "all");
  const showPagination = !search && data && data.totalPages > 1;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your catalog with categories and subcategories"
        action={{ label: "Add Category", href: "/admin/categories/new" }}
      />

      <SearchFilterBar
        id="category-search"
        value={searchInput}
        label="Search categories"
        placeholder="Search categories…"
        onChange={setSearchInput}
      >
        <FilterSelect
          id="category-parent-filter"
          label="Filter by hierarchy"
          value={parentFilter}
          onChange={(event) => {
            setParentFilter(event.target.value as ParentFilter);
            setPage(1);
          }}
        >
          <option value="all">All categories</option>
          <option value="root">Top-level only</option>
        </FilterSelect>
      </SearchFilterBar>

      {loadError ? (
        <AdminErrorState
          title="Unable to load categories"
          message="The category list could not be fetched. Check your connection and try again."
          onRetry={fetchCategories}
        />
      ) : (
        <>
          {visibleItems.length > 0 && (
            <p className="mb-2 text-xs text-admin-muted tabular" aria-live="polite">
              {search
                ? `${visibleItems.length} matching categor${visibleItems.length === 1 ? "y" : "ies"}`
                : `Showing ${visibleItems.length} of ${data?.total ?? 0} categor${
                    (data?.total ?? 0) === 1 ? "y" : "ies"
                  }`}
            </p>
          )}

          <DataTableShell
            label="Categories"
            footer={
              showPagination && data ? (
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {loading ? (
              <AdminTableSkeleton rows={8} columns={4} />
            ) : visibleItems.length === 0 ? (
              <EmptyState
                title={isFiltered ? "No matching categories" : "No categories yet"}
                description={
                  isFiltered
                    ? "No category matches the current search and filters. Try widening them."
                    : "Get started by creating your first category."
                }
                action={
                  !isFiltered
                    ? { label: "Add Category", href: "/admin/categories/new" }
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
                      Category
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted sm:table-cell"
                    >
                      Slug
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-2 text-left text-xs font-medium text-admin-muted md:table-cell"
                    >
                      Parent
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
                  {visibleItems.map((cat) => (
                    <tr key={cat._id} className="transition-colors hover:bg-admin-hover">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-3">
                          {cat.image?.url ? (
                            <img
                              src={cat.image.url}
                              alt={cat.name}
                              className="size-9 shrink-0 rounded-lg bg-admin-subtle object-cover"
                            />
                          ) : (
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-admin-subtle text-admin-faint">
                              <ImageIcon aria-hidden="true" className="size-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="max-w-[16rem] truncate font-medium text-admin-heading">
                              {cat.name}
                            </p>
                            {cat.description && (
                              <p className="max-w-[16rem] truncate text-xs text-admin-faint">
                                {cat.description}
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-admin-muted sm:hidden">
                              {cat.slug}
                              {cat.parent && typeof cat.parent === "object"
                                ? ` · in ${cat.parent.name}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2 sm:table-cell">
                        <code className="rounded bg-admin-subtle px-1.5 py-0.5 text-xs text-admin-muted">
                          {cat.slug}
                        </code>
                      </td>
                      <td className="hidden px-4 py-2 md:table-cell">
                        <span className="text-admin-muted">
                          {cat.parent && typeof cat.parent === "object"
                            ? cat.parent.name
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge status={cat.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <ButtonLink
                            href={`/admin/categories/${cat._id}`}
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            aria-label={`Edit ${cat.name}`}
                            icon={<Pencil aria-hidden="true" className="size-4" />}
                          >
                            <span className="hidden lg:inline">Edit</span>
                          </ButtonLink>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 hover:bg-admin-danger-soft hover:text-admin-danger"
                            aria-label={`Delete ${cat.name}`}
                            title="Delete category"
                            onClick={() => {
                              setDeleteTarget(cat);
                              setDeleteError(null);
                            }}
                            icon={<Trash2 aria-hidden="true" className="size-4" />}
                          >
                            <span className="hidden lg:inline">Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </DataTableShell>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={
          deleteError ||
          `Are you sure you want to delete "${deleteTarget?.name}"? Products and subcategories using it must be reassigned first.`
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
