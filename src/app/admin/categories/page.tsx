"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

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

export default function CategoriesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/categories?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setDeleteTarget(null);
        fetchCategories();
      }
    } catch (err) {
      console.error("Failed to delete category:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your products with categories"
        action={{ label: "Add Category", href: "/admin/categories/new" }}
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full sm:w-80 px-4 py-2.5 text-sm border border-admin-line rounded-lg bg-admin-surface focus:outline-none focus:ring-2 focus:ring-admin-focus focus:border-transparent"
        />
      </div>

      <div className="bg-admin-surface rounded-xl border border-admin-line overflow-hidden">
        {loading ? (
          <LoadingSpinner />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="No categories found"
            description={search ? "Try a different search term" : "Get started by creating your first category"}
            action={!search ? { label: "Add Category", href: "/admin/categories/new" } : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-admin-line bg-admin-subtle/50">
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Name</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden sm:table-cell">Slug</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3 hidden md:table-cell">Parent</th>
                    <th className="text-left font-medium text-admin-muted px-4 py-3">Status</th>
                    <th className="text-right font-medium text-admin-muted px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {data.items.map((cat) => (
                    <tr key={cat._id} className="hover:bg-admin-hover transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {cat.image?.url ? (
                            <img
                              src={cat.image.url}
                              alt={cat.name}
                              className="w-10 h-10 rounded-lg object-cover bg-admin-subtle flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-admin-subtle flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 text-admin-faint"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-admin-heading">{cat.name}</p>
                            {cat.description && (
                              <p className="text-xs text-admin-faint truncate max-w-xs">{cat.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <code className="text-xs text-admin-muted bg-admin-subtle px-1.5 py-0.5 rounded">{cat.slug}</code>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-admin-muted">
                          {cat.parent && typeof cat.parent === "object" ? cat.parent.name : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cat.isActive ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/categories/${cat._id}`}
                            className="px-2.5 py-1.5 text-xs font-medium text-admin-heading hover:bg-admin-hover rounded-md transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="px-2.5 py-1.5 text-xs font-medium text-admin-muted hover:bg-admin-hover rounded-md transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-admin-line">
              <Pagination page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? Make sure no products are using this category.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
