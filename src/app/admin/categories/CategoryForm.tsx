"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/store/Toast";

interface Category {
  _id: string;
  name: string;
}

interface CategoryImage {
  url: string;
  publicId: string;
}

interface CategoryFormProps {
  categoryId?: string;
}

export default function CategoryForm({ categoryId }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!categoryId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<CategoryImage | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch parent categories
  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          // Exclude current category from parent options
          const items = json.data.items.filter((c: Category) => c._id !== categoryId);
          setCategories(items);
        }
      })
      .catch(console.error);
  }, [categoryId]);

  // Fetch category for edit
  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/categories/${categoryId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const c = json.data;
          setName(c.name);
          setSlug(c.slug);
          setDescription(c.description || "");
          setParent(c.parent?._id || c.parent || "");
          setIsActive(c.isActive);
          if (c.image?.url) setImage(c.image);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isEdit, categoryId]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim()
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", files[0]);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        const uploaded = json.data.uploaded ?? json.data;
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          setImage({ url: uploaded[0].url, publicId: uploaded[0].publicId });
        }
        if (Array.isArray(json.data?.errors) && json.data.errors.length > 0) {
          toast(json.data.errors[0], "error");
        }
      } else {
        const message = json.error || json.message || "Upload failed";
        setError(message);
        toast(message, "error");
      }
    } catch {
      const message = "Image upload failed";
      setError(message);
      toast(message, "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = {
      name,
      slug,
      description: description || undefined,
      parent: parent || undefined,
      isActive,
      image: image || undefined,
    };

    try {
      const url = isEdit ? `/api/admin/categories/${categoryId}` : "/api/admin/categories";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/admin/categories");
      } else {
        setError(json.message || "Failed to save category");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Category Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="category-slug"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y"
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Parent Category</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            >
              <option value="">None (Top-level)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-gray-900 focus:ring-gray-400"
            />
            <span className="text-sm text-slate-700">Active</span>
          </label>
        </div>
      </div>

      {/* Category Image */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Category Image</h2>
        <div className="flex items-start gap-4">
          {image ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 group">
              <Image
                src={image.url}
                alt={name || "Category image"}
                fill
                className="object-cover"
                sizes="128px"
              />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="w-5 h-5 border-2 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-slate-400">Upload</span>
                </>
              )}
            </label>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">Recommended: square image, at least 256x256px</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/categories")}
          className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
