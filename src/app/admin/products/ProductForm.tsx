"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_COLORS, PRODUCT_SIZES } from "@/types";

interface Variant {
  _id?: string;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isActive: boolean;
}

interface ProductImage {
  url: string;
  publicId: string;
  alt?: string;
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
  compareAtPrice: undefined,
  stock: 0,
  isActive: true,
};

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
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
              compareAtPrice: v.compareAtPrice,
              stock: v.stock,
              isActive: v.isActive !== false,
            }))
          );
          setImages(p.images || []);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [isEdit, productId]);

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    setTitle(value);
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

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setImages((prev) => [...prev, ...(json.data.uploaded ?? json.data)]);
      } else {
        setError(json.message || "Upload failed");
      }
    } catch {
      setError("Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
    setLoading(true);
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
        stock: Number(v.stock),
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
      })),
      images,
    };

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
        setError(json.error || json.message || "Failed to save product");
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg">{error}</div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="Product title"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="product-slug"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 resize-y"
              placeholder="Product description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
              placeholder="tag1, tag2, tag3"
            />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-gray-900 focus:ring-gray-400"
              />
              <span className="text-sm text-slate-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-gray-900 focus:ring-gray-400"
              />
              <span className="text-sm text-slate-700">Featured</span>
            </label>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Images</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img
                src={img.url}
                alt={img.alt || "Product"}
                className="w-24 h-24 rounded-lg object-cover border border-slate-200"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/50 transition-colors">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="w-5 h-5 border-2 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </label>
        </div>
      </div>

      {/* Variants */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 text-xs font-medium text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            + Add Variant
          </button>
        </div>
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">Variant {index + 1}</span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">SKU *</label>
                  <input
                    type="text"
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, "sku", e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Price *</label>
                  <input
                    type="number"
                    value={variant.price}
                    onChange={(e) => updateVariant(index, "price", e.target.value)}
                    required
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Compare At</label>
                  <input
                    type="number"
                    value={variant.compareAtPrice || ""}
                    onChange={(e) => updateVariant(index, "compareAtPrice", e.target.value ? Number(e.target.value) : "")}
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Stock *</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, "stock", e.target.value)}
                    required
                    min={0}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Size</label>
                  <select
                    value={variant.size || ""}
                    onChange={(e) => updateVariant(index, "size", e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                  >
                    <option value="">None</option>
                    {PRODUCT_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={variant.color || ""}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
                    >
                      <option value="">None</option>
                      {PRODUCT_COLORS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {variant.color && COLOR_HEX_MAP[variant.color] && (
                      <span
                        className="shrink-0 w-6 h-6 rounded border border-slate-300"
                        style={{
                          background: COLOR_HEX_MAP[variant.color],
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
