"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_COLORS, PRODUCT_SIZES } from "@/types";
import { useToast } from "@/components/store/Toast";
import { validateProductColorImages } from "@/lib/validators";

interface Variant {
  _id?: string;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  gst: number;
  compareAtPrice?: number;
  stock: number;
  isActive: boolean;
}

interface ProductImage {
  url: string;
  publicId: string;
  alt?: string;
  color?: string;
}

interface Category {
  _id: string;
  name: string;
}

interface ProductFormProps {
  productId?: string;
}

const COLOR_HEX_MAP: Record<string, string> = {
  Black: "#000000",
  White: "#FFFFFF",
  Red: "#DC2626",
  Blue: "#2563EB",
  Green: "#16A34A",
  Yellow: "#EAB308",
  Orange: "#EA580C",
  Purple: "#9333EA",
  Pink: "#EC4899",
  Brown: "#92400E",
  Grey: "#6B7280",
  Navy: "#1E3A5F",
  Beige: "#D2B48C",
  Maroon: "#800000",
  Teal: "#0D9488",
  Coral: "#F87171",
  Olive: "#6B8E23",
  Lavender: "#C4B5FD",
  Cream: "#FFFDD0",
  Gold: "#CA8A04",
  Silver: "#C0C0C0",
  Multi: "linear-gradient(135deg, #DC2626, #EAB308, #16A34A, #2563EB, #9333EA)",
};

const emptyVariant: Variant = {
  size: "",
  color: "",
  sku: "",
  price: 0,
  gst: 18,
  compareAtPrice: undefined,
  stock: 0,
  isActive: true,
};

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!productId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [tags, setTags] = useState("");
  const [variants, setVariants] = useState<Variant[]>([{ ...emptyVariant }]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingPublicId, setRemovingPublicId] = useState("");
  const persistedPublicIds = useRef(new Set<string>());
  const uploadedPublicIds = useRef(new Set<string>());

  // Fetch categories
  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data.items);
      })
      .catch(console.error);
  }, []);

  // Fetch product for edit
  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const p = json.data;
          setTitle(p.title);
          setSlug(p.slug);
          setDescription(p.description);
          setCategory(p.category?._id || p.category || "");
          setIsActive(p.isActive);
          setIsFeatured(p.isFeatured);
          setTags(p.tags?.join(", ") || "");
          setVariants(
            p.variants.map((v: Variant) => ({
              _id: v._id,
              size: v.size || "",
              color: v.color || "",
              sku: v.sku,
              price: v.price,
              gst: typeof v.gst === "number" ? v.gst : 18,
              compareAtPrice: v.compareAtPrice,
              stock: v.stock,
              isActive: v.isActive !== false,
            }))
          );
          const productImages: ProductImage[] = p.images || [];
          setImages(productImages);
          persistedPublicIds.current = new Set(
            productImages.map((image) => image.publicId)
          );
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isEdit, productId]);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit && images.length === 0) {
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

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const safeSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (!safeSlug) {
      const message = "Enter a valid product slug before uploading images";
      setError(message);
      toast(message, "error");
      e.target.value = "";
      return;
    }

    const remainingSlots = 10 - images.length;
    if (remainingSlots <= 0) {
      const message = "A product can have at most 10 images";
      setError(message);
      toast(message, "error");
      e.target.value = "";
      return;
    }

    const usedIndexes = new Set(
      [...images.map((image) => image.publicId), ...persistedPublicIds.current]
        .flatMap((publicId) => {
          const match = publicId.match(
            new RegExp(`/${safeSlug}/${safeSlug}-(\\d+)$`)
          );
          return match ? [Number(match[1])] : [];
        })
    );
    const availableIndexes = Array.from(
      { length: 10 },
      (_, index) => index + 1
    ).filter((index) => !usedIndexes.has(index));
    const selectedFiles = Array.from(files).slice(
      0,
      Math.min(remainingSlots, availableIndexes.length)
    );

    if (selectedFiles.length === 0) {
      const message = "Save the product before uploading a replacement image";
      setError(message);
      toast(message, "error");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError("");
    try {
      const uploaded: ProductImage[] = [];
      const errors: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append("files", selectedFiles[i]);
        formData.append("folder", "products");
        formData.append("productSlug", safeSlug);
        formData.append("startIndex", String(availableIndexes[i]));

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (json.success) {
          uploaded.push(...(json.data.uploaded ?? json.data));
        } else {
          errors.push(json.error || json.message || "Upload failed");
        }
      }

      if (uploaded.length > 0) {
        uploaded.forEach((image) => uploadedPublicIds.current.add(image.publicId));
        setImages((prev) => [...prev, ...uploaded]);
      }
      if (errors.length > 0) {
        const message = errors[0];
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

  const removeImage = async (index: number) => {
    const image = images[index];
    if (!image || removingPublicId) return;

    // Saved images are deleted by the product update endpoint. Newly uploaded
    // images must be deleted now because they are not yet referenced in MongoDB.
    if (uploadedPublicIds.current.has(image.publicId)) {
      setRemovingPublicId(image.publicId);
      try {
        const res = await fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: image.publicId }),
        });
        const json = await res.json();
        if (!json.success && res.status !== 404) {
          const message = json.error || json.message || "Failed to remove image";
          setError(message);
          toast(message, "error");
          return;
        }
      } catch {
        const message = "Failed to remove image";
        setError(message);
        toast(message, "error");
        return;
      } finally {
        setRemovingPublicId("");
      }
    }

    uploadedPublicIds.current.delete(image.publicId);
    setImages((prev) => prev.filter((item) => item.publicId !== image.publicId));
  };

  const handleCancel = async () => {
    const unsavedImages = images.filter(
      (image) => uploadedPublicIds.current.has(image.publicId)
    );
    await Promise.allSettled(
      unsavedImages.map((image) =>
        fetch("/api/admin/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: image.publicId }),
        })
      )
    );
    router.push("/admin/products");
  };

  // Variant management
  const addVariant = () => setVariants((prev) => [...prev, { ...emptyVariant }]);

  const generateSku = (base: string, size?: string, color?: string): string => {
    const parts = [base, size, color].filter(Boolean).map((p) =>
      (p as string).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
    );
    return parts.join("-");
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number | boolean) => {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== index) return v;
        const updated = { ...v, [field]: value };

        // Auto-generate SKU when size or color changes and SKU is empty or was auto-generated
        if ((field === "size" || field === "color") && !isEdit) {
          const baseSlug = slug
            .split("-")
            .slice(0, 2)
            .join("")
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 10) || "SKU";
          const newSku = generateSku(baseSlug, updated.size, updated.color);
          if (!v.sku || v.sku === generateSku(baseSlug, v.size, v.color)) {
            updated.sku = newSku;
          }
        }

        return updated;
      })
    );
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const body = {
      title,
      slug,
      description,
      category: category || undefined,
      isActive,
      isFeatured,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      variants: variants.map((v) => ({
        ...v,
        price: Number(v.price),
        gst: Number(v.gst),
        stock: Number(v.stock),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
      })),
      images,
    };

    const colorErrors = validateProductColorImages(body.variants, body.images);
    if (colorErrors.length > 0) {
      const message = colorErrors.join(". ");
      setError(message);
      toast(message, "error");
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        router.push("/admin/products");
      } else {
        const message = json.error || json.message || "Failed to save product";
        setError(message);
        toast(message, "error");
      }
    } catch {
      const message = "Something went wrong";
      setError(message);
      toast(message, "error");
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 text-sm text-admin-body bg-admin-subtle border border-admin-line rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <h2 className="text-base font-semibold text-admin-heading mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-admin-body mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
              placeholder="Product title"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-admin-body mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              disabled={images.length > 0}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus disabled:bg-admin-subtle disabled:text-admin-muted"
              placeholder="product-slug"
            />
            {images.length > 0 && (
              <p className="mt-1 text-xs text-admin-muted">
                Remove all images before changing the slug.
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-admin-body mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus resize-y"
              placeholder="Product description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-body mb-1.5">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-admin-line rounded-lg focus:outline-none focus:ring-2 focus:ring-admin-focus"
              placeholder="tag1, tag2, tag3"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
              />
              <span className="text-sm text-admin-body">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-admin-line-strong text-admin-heading focus:ring-admin-focus"
              />
              <span className="text-sm text-admin-body">Featured</span>
            </label>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <h2 className="text-base font-semibold text-admin-heading mb-1">Images</h2>
        <p className="text-xs text-admin-muted mb-4">
          Tag images with a color so the storefront gallery updates when shoppers pick that colorway.
          Untagged images are shown for every color.
        </p>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, index) => (
            <div key={img.publicId || index} className="relative group w-24">
              <img
                src={img.url}
                alt={img.alt || "Product"}
                className="w-24 h-24 rounded-lg object-cover border border-admin-line"
              />
              <button
                type="button"
                onClick={() => void removeImage(index)}
                disabled={!!removingPublicId}
                className="absolute -top-2 -right-2 w-6 h-6 bg-admin-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 disabled:opacity-50 transition-opacity"
              >
                ×
              </button>
              <select
                value={img.color || ""}
                onChange={(e) =>
                  setImages((prev) =>
                    prev.map((image, i) =>
                      i === index ? { ...image, color: e.target.value || undefined } : image
                    )
                  )
                }
                className="mt-1.5 w-full rounded-md border border-admin-line bg-admin-surface px-1.5 py-1 text-[11px] text-admin-body"
                aria-label={`Color for image ${index + 1}`}
              >
                <option value="">Any color</option>
                {PRODUCT_COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-admin-line flex items-center justify-center cursor-pointer hover:border-admin-line-strong hover:bg-admin-hover transition-colors self-start">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="w-5 h-5 border-2 border-admin-line border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-admin-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </label>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-admin-surface rounded-xl border border-admin-line p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-admin-heading">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 text-xs font-medium text-admin-heading border border-admin-line rounded-lg hover:bg-admin-hover transition-colors"
          >
            + Add Variant
          </button>
        </div>
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="p-4 bg-admin-subtle rounded-lg border border-admin-line">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-admin-muted">Variant {index + 1}</span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-xs text-admin-muted hover:text-admin-body"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <div>
                  <label className="block text-xs text-admin-muted mb-1">SKU *</label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Price (excl. GST) *</label>
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    required
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">GST % *</label>
                  <input
                    type="number"
                    value={variant.gst}
                    onChange={(e) => updateVariant(index, "gst", e.target.value)}
                    required
                    min={0}
                    max={100}
                    step={1}
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Compare At</label>
                  <input
                    type="number"
                    value={variant.compareAtPrice || ""}
                    onChange={(e) => updateVariant(index, "compareAtPrice", e.target.value ? Number(e.target.value) : "")}
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Stock *</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", e.target.value)}
                    required
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus"
                  />
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Size</label>
                  <select
                    value={variant.size || ""}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface"
                  >
                    <option value="">None</option>
                    {PRODUCT_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-admin-muted mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={variant.color || ""}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-admin-line rounded-md focus:outline-none focus:ring-2 focus:ring-admin-focus bg-admin-surface"
                    >
                      <option value="">None</option>
                      {PRODUCT_COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {variant.color && COLOR_HEX_MAP[variant.color] && (
                      <span
                        className="shrink-0 w-6 h-6 rounded border border-admin-line-strong"
                        style={{
                          background: COLOR_HEX_MAP[variant.color],
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
              {typeof variant.price === "number" && variant.price > 0 && (
                <p className="mt-2 text-xs text-admin-muted">
                  Price incl. GST ({variant.gst ?? 18}%): ₹
                  {(
                    Number(variant.price) *
                    (1 + (Number(variant.gst ?? 18) / 100))
                  ).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-admin-primary rounded-lg hover:bg-admin-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={() => void handleCancel()}
          className="px-5 py-2.5 text-sm font-medium text-admin-body bg-admin-surface border border-admin-line-strong rounded-lg hover:bg-admin-hover transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
