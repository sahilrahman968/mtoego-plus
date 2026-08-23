"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { PRODUCT_COLORS, PRODUCT_SIZES } from "@/types";
import { useToast } from "@/components/store/Toast";
import { validateProductColorImages } from "@/lib/validators";
import { Button } from "../components/Button";
import {
  CheckboxField,
  FormSection,
  SelectField,
  TextAreaField,
  TextField,
  controlClassName,
  FieldShell,
} from "../components/Fields";
import { AdminFormSkeleton } from "../components/FeedbackState";

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

interface RelatedProductOption {
  _id: string;
  title: string;
  slug: string;
  images?: { url: string }[];
}

interface ProductFormProps {
  productId?: string;
}

const MAX_RELATED_PRODUCTS = 12;
const DEFAULT_RELATED_HEADING = "Related products";

function ProductThumb({ url, title }: { url?: string; title: string }) {
  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-admin-subtle">
      {url ? (
        <Image src={url} alt={title} fill className="object-cover" sizes="40px" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-admin-faint">
          —
        </span>
      )}
    </span>
  );
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
  const [relatedProducts, setRelatedProducts] = useState<RelatedProductOption[]>([]);
  const [relatedProductsHeading, setRelatedProductsHeading] =
    useState(DEFAULT_RELATED_HEADING);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [relatedSearchResults, setRelatedSearchResults] = useState<RelatedProductOption[]>(
    []
  );
  const [relatedSearching, setRelatedSearching] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([{ ...emptyVariant }]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [removingPublicId, setRemovingPublicId] = useState("");
  const persistedPublicIds = useRef(new Set<string>());
  const uploadedPublicIds = useRef(new Set<string>());

  const relatedProductIds = useMemo(
    () => new Set(relatedProducts.map((product) => product._id)),
    [relatedProducts]
  );

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
          setRelatedProductsHeading(
            p.relatedProductsHeading?.trim() || DEFAULT_RELATED_HEADING
          );
          setRelatedProducts(
            (p.relatedProducts || [])
              .map((row: RelatedProductOption | string) =>
                typeof row === "object" && row && "_id" in row ? row : null
              )
              .filter(Boolean) as RelatedProductOption[]
          );
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

  const searchRelatedProducts = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setRelatedSearchResults([]);
        return;
      }
      setRelatedSearching(true);
      try {
        const res = await fetch(
          `/api/admin/products?search=${encodeURIComponent(q.trim())}&limit=8&isActive=true`
        );
        const json = await res.json();
        if (json.success) {
          setRelatedSearchResults(
            (json.data.items || []).filter(
              (product: RelatedProductOption) => product._id !== productId
            )
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setRelatedSearching(false);
      }
    },
    [productId]
  );

  useEffect(() => {
    const id = window.setTimeout(() => void searchRelatedProducts(relatedSearch), 280);
    return () => window.clearTimeout(id);
  }, [relatedSearch, searchRelatedProducts]);

  const addRelatedProduct = (product: RelatedProductOption) => {
    if (product._id === productId) {
      toast("A product cannot be related to itself", "error");
      return;
    }
    if (relatedProductIds.has(product._id)) return;
    if (relatedProducts.length >= MAX_RELATED_PRODUCTS) {
      toast(`You can select at most ${MAX_RELATED_PRODUCTS} related products`, "error");
      return;
    }
    setRelatedProducts((prev) => [...prev, product]);
    setRelatedSearch("");
    setRelatedSearchResults([]);
  };

  const removeRelatedProduct = (id: string) => {
    setRelatedProducts((prev) => prev.filter((product) => product._id !== id));
  };

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
      relatedProducts: relatedProducts.map((product) => product._id),
      relatedProductsHeading:
        relatedProductsHeading.trim() || DEFAULT_RELATED_HEADING,
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
    return <AdminFormSkeleton />;
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

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <FormSection
            title="Basic details"
            description="How the product is named and described in the storefront."
          >
            <div className="sm:col-span-2">
              <TextField
                id="product-title"
                label="Title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
                placeholder="Product title"
              />
            </div>
            <div className="sm:col-span-2">
              <TextField
                id="product-slug"
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                disabled={images.length > 0}
                placeholder="product-slug"
                hint={
                  images.length > 0
                    ? "Remove all images before changing the slug — uploaded files are stored under it."
                    : "Used in the storefront URL and as the image folder name."
                }
              />
            </div>
            <div className="sm:col-span-2">
              <TextAreaField
                id="product-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={5}
                placeholder="Product description…"
              />
            </div>
          </FormSection>

          <FormSection
            title="Media"
            description="Tag an image with a color so the storefront gallery follows the shopper's colorway. Untagged images show for every color, and the first image is the thumbnail."
            columns={1}
          >
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {images.map((img, index) => (
                  <div key={img.publicId || index}>
                    <div className="relative">
                      <img
                        src={img.url}
                        alt={img.alt || `Product image ${index + 1}`}
                        className="aspect-square w-full rounded-lg border border-admin-line object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => void removeImage(index)}
                        disabled={!!removingPublicId}
                        aria-label={`Remove image ${index + 1}`}
                        className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full border border-admin-line bg-admin-surface/95 text-admin-muted shadow-sm transition-colors hover:border-admin-danger-line hover:bg-admin-danger-soft hover:text-admin-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus disabled:opacity-50"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                    <select
                      value={img.color || ""}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((image, i) =>
                            i === index ? { ...image, color: e.target.value || undefined } : image
                          )
                        )
                      }
                      className="mt-1.5 w-full rounded-md border border-admin-line-strong bg-admin-surface px-2 py-1.5 text-xs text-admin-body outline-none transition focus:border-admin-primary focus:ring-2 focus:ring-admin-focus/50"
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
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-admin-line text-admin-faint transition-colors hover:border-admin-line-strong hover:bg-admin-hover focus-within:border-admin-primary focus-within:ring-2 focus-within:ring-admin-focus/50">
                  <input
                    type="file"
                    multiple
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
              </div>
              <p className="mt-3 text-xs text-admin-muted tabular">
                {images.length} of 10 images used
              </p>
            </div>
          </FormSection>
        </div>

        <div className="space-y-5">
          <FormSection
            title="Organization"
            description="Where the product sits in the catalog."
            columns={1}
          >
            <SelectField
              id="product-category"
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              hint="Products need a category to appear in storefront browsing."
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </SelectField>
            <TextField
              id="product-tags"
              label="Tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              hint="Comma separated. Used for search."
            />
            <div className="space-y-3">
              <CheckboxField
                id="product-active"
                label="Active"
                hint="Visible and purchasable in the store."
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <CheckboxField
                id="product-featured"
                label="Featured"
                hint="Highlighted on the storefront home page."
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
            </div>
          </FormSection>
        </div>
      </div>

      <FormSection
        title="Related products"
        description="Curate products shown under this item on the product details page. Leave empty to fall back to same-category suggestions."
        columns={1}
      >
        <TextField
          id="related-products-heading"
          label="Section heading"
          value={relatedProductsHeading}
          onChange={(e) => setRelatedProductsHeading(e.target.value)}
          placeholder={DEFAULT_RELATED_HEADING}
          maxLength={80}
          hint="Shown above the related products grid on the storefront."
        />
        <div>
          <label
            htmlFor="related-products-search"
            className="block text-sm font-medium text-admin-body"
          >
            Add products
          </label>
          <div className="relative mt-1.5">
            <input
              id="related-products-search"
              aria-label="Search products to add as related"
              value={relatedSearch}
              onChange={(e) => setRelatedSearch(e.target.value)}
              placeholder="Search products to add…"
              className={controlClassName}
            />
            {(relatedSearching || relatedSearchResults.length > 0) && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-admin-line bg-admin-surface shadow-lg">
                {relatedSearching && (
                  <p className="px-3 py-2 text-xs text-admin-faint">Searching…</p>
                )}
                {relatedSearchResults.map((product) => (
                  <button
                    type="button"
                    key={product._id}
                    onClick={() => addRelatedProduct(product)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-admin-hover"
                  >
                    <ProductThumb url={product.images?.[0]?.url} title={product.title} />
                    <span className="text-sm text-admin-body">{product.title}</span>
                    {relatedProductIds.has(product._id) && (
                      <span className="ml-auto text-[11px] text-admin-faint">Added</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-admin-muted">
            Up to {MAX_RELATED_PRODUCTS}. Search by title.
          </p>
        </div>
        {relatedProducts.length > 0 ? (
          <ul className="divide-y divide-admin-line rounded-lg border border-admin-line">
            {relatedProducts.map((product) => (
              <li
                key={product._id}
                className="flex items-center gap-3 px-3 py-2"
              >
                <ProductThumb url={product.images?.[0]?.url} title={product.title} />
                <span className="min-w-0 flex-1 truncate text-sm text-admin-body">
                  {product.title}
                </span>
                <button
                  type="button"
                  onClick={() => removeRelatedProduct(product._id)}
                  aria-label={`Remove ${product.title}`}
                  className="rounded-md p-1.5 text-admin-muted transition-colors hover:bg-admin-danger-soft hover:text-admin-danger"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-admin-muted">
            No curated related products yet — the storefront will suggest items from the same
            category.
          </p>
        )}
      </FormSection>

      <FormSection
        title="Pricing & inventory"
        description="Each variant carries its own SKU, price, GST rate, and stock. Stock is tracked here — there is no separate inventory screen."
        columns={1}
      >
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div
              key={index}
              className="rounded-lg border border-admin-line bg-admin-subtle/50 p-3.5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-admin-muted">
                  Variant {index + 1}
                </span>
                {variants.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeVariant(index)}
                    aria-label={`Remove variant ${index + 1}`}
                    className="hover:bg-admin-danger-soft hover:text-admin-danger"
                    icon={<Trash2 aria-hidden="true" className="size-4" />}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <TextField
                  id={`variant-${index}-sku`}
                  label="SKU"
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, "sku", e.target.value)}
                  required
                />
                <TextField
                  id={`variant-${index}-price`}
                  label="Price (excl. GST)"
                  type="number"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, "price", e.target.value)}
                  required
                  min={0}
                />
                <TextField
                  id={`variant-${index}-gst`}
                  label="GST %"
                  type="number"
                  value={variant.gst}
                  onChange={(e) => updateVariant(index, "gst", e.target.value)}
                  required
                  min={0}
                  max={100}
                  step={1}
                />
                <TextField
                  id={`variant-${index}-compare-at`}
                  label="Compare at"
                  type="number"
                  value={variant.compareAtPrice || ""}
                  onChange={(e) =>
                    updateVariant(
                      index,
                      "compareAtPrice",
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  min={0}
                />
                <TextField
                  id={`variant-${index}-stock`}
                  label="Stock"
                  type="number"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, "stock", e.target.value)}
                  required
                  min={0}
                />
                <SelectField
                  id={`variant-${index}-size`}
                  label="Size"
                  value={variant.size || ""}
                  onChange={(e) => updateVariant(index, "size", e.target.value)}
                >
                  <option value="">None</option>
                  {PRODUCT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </SelectField>
                <FieldShell id={`variant-${index}-color`} label="Color">
                  <div className="mt-1.5 flex items-center gap-2">
                    <select
                      id={`variant-${index}-color`}
                      value={variant.color || ""}
                      onChange={(e) => updateVariant(index, "color", e.target.value)}
                      className={controlClassName}
                    >
                      <option value="">None</option>
                      {PRODUCT_COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {variant.color && COLOR_HEX_MAP[variant.color] && (
                      <span
                        aria-hidden="true"
                        className="size-8 shrink-0 rounded-md border border-admin-line-strong"
                        style={{ background: COLOR_HEX_MAP[variant.color] }}
                      />
                    )}
                  </div>
                </FieldShell>
              </div>
              {typeof variant.price === "number" && variant.price > 0 && (
                <p className="mt-3 text-xs text-admin-muted price">
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
          <Button
            variant="secondary"
            onClick={addVariant}
            icon={<Plus aria-hidden="true" className="size-4" />}
          >
            Add variant
          </Button>
        </div>
      </FormSection>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-admin-line bg-admin-canvas/95 py-3 backdrop-blur">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </Button>
        <Button variant="secondary" onClick={() => void handleCancel()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
