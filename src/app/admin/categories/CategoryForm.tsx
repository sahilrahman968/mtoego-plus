"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { useToast } from "@/components/store/Toast";
import { Button } from "../components/Button";
import {
  CheckboxField,
  FormSection,
  SelectField,
  TextAreaField,
  TextField,
} from "../components/Fields";
import { AdminFormSkeleton } from "../components/FeedbackState";

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
    return <AdminFormSkeleton sections={1} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger"
        >
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FormSection
            title="Basic details"
            description="How the category is named across the storefront."
          >
            <TextField
              id="category-name"
              label="Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Category name"
            />
            <TextField
              id="category-slug"
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              placeholder="category-slug"
              hint="Used in the storefront URL. The stored image is renamed to match on save."
            />
            <div className="sm:col-span-2">
              <TextAreaField
                id="category-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description…"
                hint="Shown on the category page when present."
              />
            </div>
          </FormSection>

          <FormSection
            title="Media"
            description="Recommended: square image, at least 256×256px."
            columns={1}
          >
            <div>
              {image ? (
                <div className="relative size-32 overflow-hidden rounded-lg border border-admin-line">
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
                    aria-label="Remove category image"
                    className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full border border-admin-line bg-admin-surface/95 text-admin-muted shadow-sm transition-colors hover:border-admin-danger-line hover:bg-admin-danger-soft hover:text-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex size-32 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-admin-line text-admin-faint transition-colors hover:border-admin-line-strong hover:bg-admin-hover focus-within:border-admin-primary focus-within:ring-2 focus-within:ring-admin-focus/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="size-5 animate-spin rounded-full border-2 border-admin-line border-t-admin-primary" />
                  ) : (
                    <>
                      <Upload aria-hidden="true" className="size-5" />
                      <span className="text-xs font-medium">Upload</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </FormSection>
        </div>

        <div className="space-y-5">
          <FormSection
            title="Organization"
            description="Where the category sits in the catalog tree."
            columns={1}
          >
            <SelectField
              id="category-parent"
              label="Parent category"
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              hint="Leave as top-level unless this is a subcategory."
            >
              <option value="">None (Top-level)</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <CheckboxField
              id="category-active"
              label="Active"
              hint="Visible in storefront navigation and browsing."
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-admin-line bg-admin-canvas/95 py-3 backdrop-blur">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Category" : "Create Category"}
        </Button>
        <Button variant="secondary" onClick={() => void handleCancel()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
