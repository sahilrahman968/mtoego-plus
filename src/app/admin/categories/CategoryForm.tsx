"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/jewellery/shared/Toast";

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
  // Public ID currently referenced by the saved category; it may only be
  // deleted from Cloudinary once the form has been submitted successfully.
  const savedPublicId = useRef<string | null>(null);

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
          if (c.image?.url) {
            setImage(c.image);
            savedPublicId.current = c.image.publicId ?? null;
          }
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

  const deleteFromStorage = async (publicId: string) => {
    try {
      await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
    } catch (err) {
      console.error("Failed to delete image from storage:", err);
    }
  };

  /** Drop an image that is not (yet) referenced by the saved category. */
  const discardUnsavedImage = async (target: CategoryImage | null) => {
    if (!target?.publicId || target.publicId === savedPublicId.current) return;
    await deleteFromStorage(target.publicId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    if (!slug.trim()) {
      toast("Enter a category name or slug before uploading an image", "error");
      e.target.value = "";
      return;
    }

    const previous = image;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", files[0]);
      formData.append("folder", "categories");
      formData.append("publicId", slug);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        const uploaded = json.data.uploaded ?? json.data;
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          const next = { url: uploaded[0].url, publicId: uploaded[0].publicId };
          setImage(next);
          if (previous && previous.publicId !== next.publicId) {
            await discardUnsavedImage(previous);
          }
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

  /** Keep the stored asset named after the slug when the slug changed post-upload. */
  const syncImageName = async (current: CategoryImage): Promise<CategoryImage> => {
    try {
      const res = await fetch("/api/admin/upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: current.publicId,
          folder: "categories",
          name: slug,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.renamed) {
        return { url: json.data.url, publicId: json.data.publicId };
      }
    } catch (err) {
      console.error("Failed to rename image in storage:", err);
    }
    return current;
  };

  const handleRemoveImage = async () => {
    const removed = image;
    setImage(null);
    await discardUnsavedImage(removed);
  };

  const handleCancel = async () => {
    await discardUnsavedImage(image);
    router.push("/admin/categories");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let finalImage = image;
      if (image) {
        finalImage = await syncImageName(image);
        if (finalImage.publicId !== image.publicId) {
          if (savedPublicId.current === image.publicId) {
            savedPublicId.current = finalImage.publicId;
          }
          setImage(finalImage);
        }
      }

      const body: Record<string, unknown> = {
        name,
        slug,
        description: description || undefined,
        parent: parent || undefined,
        isActive,
        image: finalImage, // explicit null so removing the image clears it on update
      };

      const url = isEdit ? `/api/admin/categories/${categoryId}` : "/api/admin/categories";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        const replaced = savedPublicId.current;
        if (replaced && replaced !== finalImage?.publicId) {
          await deleteFromStorage(replaced);
        }
        savedPublicId.current = finalImage?.publicId ?? null;
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
        <div className="w-8 h-8 border-3 border-admin-line border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 text-sm text-admin-body bg-admin-subtle border border-admin-line rounded-lg">{error}</div>
      )}

      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <h2 className="text-base font-semibold text-admin-heading mb-4">Category Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
              placeholder="category-slug"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus resize-y"
              placeholder="Optional description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Parent Category</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface"
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
              className="w-4 h-4 rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
            />
            <span className="text-sm text-admin-body">Active</span>
          </label>
        </div>
      </div>

      {/* Category Image */}
      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <h2 className="text-base font-semibold text-admin-heading mb-4">Category Image</h2>
        <div className="flex items-start gap-4">
          {image ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-admin-line group">
              <Image
                src={image.url}
                alt={name || "Category image"}
                fill
                className="object-cover"
                sizes="128px"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-1 right-1 w-6 h-6 bg-admin-surface/90 rounded-full flex items-center justify-center text-admin-muted hover:text-admin-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <label className="w-32 h-32 rounded-lg border-2 border-dashed border-admin-line flex flex-col items-center justify-center cursor-pointer hover:border-admin-line-strong transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="w-5 h-5 border-2 border-admin-line border-t-gray-900 rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-6 h-6 text-admin-faint mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-admin-faint">Upload</span>
                </>
              )}
            </label>
          )}
        </div>
        <p className="text-xs text-admin-faint mt-2">Recommended: square image, at least 256x256px</p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-admin-primary rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 text-sm font-medium text-admin-body bg-admin-surface border border-admin-line-strong rounded-lg hover:bg-admin-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
