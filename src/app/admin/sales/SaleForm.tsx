"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useToast } from "@/components/store/Toast";
import { priceInclGst } from "@/lib/pricing";
import {
  BANNER_CTA_POSITIONS,
  bannerCtaPositionClass,
  isBannerCtaPosition,
  type BannerCtaPosition,
} from "@/lib/banner-cta";
import { Button } from "../components/Button";
import { AdminFormSkeleton } from "../components/FeedbackState";

interface SaleFormProps {
  saleId?: string;
}

type DiscountType = "percentage" | "amount";

interface PickedProduct {
  _id: string;
  title: string;
  slug: string;
  images: { url: string }[];
  variants: { price: number; gst?: number; isActive?: boolean }[];
  discountType: DiscountType;
  value: number;
}

interface BannerImage {
  url: string;
  publicId: string;
}

const BANNER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const BANNER_MAX_BYTES = 10 * 1024 * 1024;
const MAX_SALE_ITEMS = 80;

interface CollectionOption {
  key: string;
  label: string;
  description: string;
}

interface CollectionCategory {
  _id: string;
  name: string;
}

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

/** Kept in sync with the sale masthead scrim in `(store)/sale/[slug]`, so the
 *  preview shows how dark the artwork actually reads behind the hero copy. */
const STOREFRONT_SCRIMS = [
  "bg-[linear-gradient(to_right,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.6)_45%,rgba(0,0,0,0.32)_72%,rgba(0,0,0,0.72)_100%)]",
  "bg-gradient-to-t from-black/85 via-transparent to-black/55",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function previewSalePrice(original: number, discountType: DiscountType, value: number) {
  if (original <= 0) return original;
  if (discountType === "percentage") {
    return Math.round(original * (1 - Math.min(90, Math.max(0, value)) / 100) * 100) / 100;
  }
  return Math.round(Math.max(0.01, original - Math.max(0, value)) * 100) / 100;
}

export default function SaleForm({ saleId }: SaleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!saleId;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("SALE");
  const [homeHeadline, setHomeHeadline] = useState("Flash Cut");
  const [bannerCtaLabel, setBannerCtaLabel] = useState("Shop The Sale");
  const [bannerCtaHref, setBannerCtaHref] = useState("");
  const [bannerCtaPosition, setBannerCtaPosition] = useState<BannerCtaPosition>("bottom-left");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 0, 0);
    return toLocalInput(end);
  });
  const [isActive, setIsActive] = useState(true);
  const [showOnHome, setShowOnHome] = useState(true);
  const [showInNav, setShowInNav] = useState(true);
  const [allowCoupons, setAllowCoupons] = useState(true);
  const [priority, setPriority] = useState(10);
  const [homeLimit, setHomeLimit] = useState(5);
  const [defaultDiscountType, setDefaultDiscountType] = useState<DiscountType>("percentage");
  const [defaultDiscountValue, setDefaultDiscountValue] = useState(20);
  const [banner, setBanner] = useState<BannerImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showRawBanner, setShowRawBanner] = useState(false);
  const [items, setItems] = useState<PickedProduct[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PickedProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [activeCollection, setActiveCollection] = useState<string>("");
  const [categoryId, setCategoryId] = useState("");
  const [collectionMeta, setCollectionMeta] = useState<CollectionOption | null>(null);
  const [collectionItems, setCollectionItems] = useState<PickedProduct[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const savedPublicId = useRef<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/sales/product-collections")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || json.message || "Failed to load sale");
          return;
        }
        setCollections(json.data.collections || []);
        setCategories(json.data.categories || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/sales/${saleId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const c = json.data;
        setTitle(c.title || "");
        setSlug(c.slug || "");
        setSubtitle(c.subtitle || "");
        setDescription(c.description || "");
        setBadgeLabel(c.badgeLabel || "SALE");
        setHomeHeadline(c.homeHeadline || "Flash Cut");
        setBannerCtaLabel(c.bannerCtaLabel || "Shop The Sale");
        setBannerCtaHref(c.bannerCtaHref || `/sale/${c.slug || ""}`);
        setBannerCtaPosition(
          isBannerCtaPosition(c.bannerCtaPosition) ? c.bannerCtaPosition : "bottom-left"
        );
        setSeoTitle(c.seoTitle || "");
        setSeoDescription(c.seoDescription || "");
        setStartsAt(c.startsAt ? toLocalInput(new Date(c.startsAt)) : "");
        setEndsAt(c.endsAt ? toLocalInput(new Date(c.endsAt)) : "");
        setIsActive(c.isActive !== false);
        setShowOnHome(c.showOnHome !== false);
        setShowInNav(c.showInNav !== false);
        setAllowCoupons(c.allowCoupons !== false);
        setPriority(c.priority ?? 10);
        setHomeLimit(c.homeLimit ?? 5);
        setDefaultDiscountType(c.defaultDiscountType || "percentage");
        setDefaultDiscountValue(c.defaultDiscountValue ?? 20);
        if (c.banner?.url) {
          setBanner(c.banner);
          savedPublicId.current = c.banner.publicId ?? null;
        }
        setItems(
          (c.items || [])
            .map((row: { product: PickedProduct | string; discountType: DiscountType; value: number }) => {
              const product = typeof row.product === "object" ? row.product : null;
              if (!product) return null;
              return {
                ...product,
                discountType: row.discountType,
                value: row.value,
              };
            })
            .filter(Boolean)
        );
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load sale");
      })
      .finally(() => setFetching(false));
  }, [isEdit, saleId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!isEdit) setSlug(slugify(value));
  };

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/products?search=${encodeURIComponent(q.trim())}&limit=8&isActive=true`
      );
      const json = await res.json();
      if (json.success) {
        setSearchResults(
          (json.data.items || []).map((p: PickedProduct) => ({
            ...p,
            discountType: defaultDiscountType,
            value: defaultDiscountValue,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, [defaultDiscountType, defaultDiscountValue]);

  useEffect(() => {
    const id = window.setTimeout(() => searchProducts(search), 280);
    return () => window.clearTimeout(id);
  }, [search, searchProducts]);

  const itemIds = useMemo(() => new Set(items.map((item) => item._id)), [items]);

  const addProducts = useCallback(
    (products: PickedProduct[], options?: { fromSearch?: boolean }) => {
      const incoming = products.filter((product) => !itemIds.has(product._id));
      if (incoming.length === 0) {
        if (!options?.fromSearch) toast("Those products are already in the sale", "error");
        return;
      }
      const room = MAX_SALE_ITEMS - items.length;
      if (room <= 0) {
        toast(`A sale can include at most ${MAX_SALE_ITEMS} products`, "error");
        return;
      }
      const accepted = incoming.slice(0, room);
      const acceptedIds = new Set(accepted.map((product) => product._id));
      setItems((prev) => [
        ...prev,
        ...accepted.map((product) => ({
          ...product,
          discountType: defaultDiscountType,
          value: defaultDiscountValue,
        })),
      ]);
      setPickedIds((prev) => prev.filter((id) => !acceptedIds.has(id)));
      if (accepted.length < incoming.length) {
        toast(`Added ${accepted.length} products. Sale limit is ${MAX_SALE_ITEMS}.`, "error");
      }
      if (options?.fromSearch) {
        setSearch("");
        setSearchResults([]);
      }
    },
    [defaultDiscountType, defaultDiscountValue, itemIds, items.length, toast]
  );

  const addProduct = (product: PickedProduct) => {
    addProducts([product], { fromSearch: true });
  };

  const loadCollection = useCallback(async (key: string, nextCategoryId?: string) => {
    if (!key) {
      setActiveCollection("");
      setCollectionMeta(null);
      setCollectionItems([]);
      setPickedIds([]);
      return;
    }
    setActiveCollection(key);
    setCollectionLoading(true);
    try {
      const params = new URLSearchParams({ collection: key });
      if (key === "category" && nextCategoryId) params.set("categoryId", nextCategoryId);
      const res = await fetch(`/api/admin/sales/product-collections?${params}`);
      const json = await res.json();
      if (!json.success) {
        toast(json.error || "Failed to load collection", "error");
        return;
      }
      const rows: PickedProduct[] = json.data.items || [];
      setCollectionMeta({
        key: json.data.key,
        label: json.data.label,
        description: json.data.description,
      });
      setCollectionItems(rows);
      setPickedIds(rows.map((row) => row._id));
    } catch {
      toast("Failed to load collection", "error");
    } finally {
      setCollectionLoading(false);
    }
  }, [toast]);

  const applyDefaultToAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        discountType: defaultDiscountType,
        value: defaultDiscountValue,
      }))
    );
  };

  const deleteFromStorage = async (publicId: string) => {
    try {
      await fetch("/api/admin/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
    } catch (err) {
      console.error("Failed to delete banner from storage:", err);
    }
  };

  /** Drop a banner that the saved campaign does not reference yet. */
  const discardUnsavedBanner = async (target: BannerImage | null) => {
    if (!target?.publicId || target.publicId === savedPublicId.current) return;
    await deleteFromStorage(target.publicId);
  };

  const uploadBanner = async (file: File) => {
    if (!slug.trim()) {
      toast("Set a sale URL before uploading a banner", "error");
      return;
    }
    if (!BANNER_MIME_TYPES.includes(file.type)) {
      toast("Banner must be a JPG, PNG, WebP or AVIF image", "error");
      return;
    }
    if (file.size > BANNER_MAX_BYTES) {
      toast("Banner must be smaller than 10 MB", "error");
      return;
    }

    const previous = banner;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      formData.append("folder", "sales");
      formData.append("publicId", slug);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        const uploaded = json.data.uploaded ?? json.data;
        if (Array.isArray(uploaded) && uploaded.length > 0) {
          const next = { url: uploaded[0].url, publicId: uploaded[0].publicId };
          setBanner(next);
          if (previous && previous.publicId !== next.publicId) {
            await discardUnsavedBanner(previous);
          }
          toast(previous ? "Banner replaced" : "Banner uploaded", "success");
        }
      } else {
        toast(json.error || json.message || "Upload failed", "error");
      }
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void uploadBanner(file);
  };

  const handleBannerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadBanner(file);
  };

  const handleRemoveBanner = async () => {
    const removed = banner;
    setBanner(null);
    await discardUnsavedBanner(removed);
  };

  const handleCancel = async () => {
    await discardUnsavedBanner(banner);
    router.push("/admin/sales");
  };

  const saleUrl = useMemo(() => `/sale/${slug || "your-sale"}`, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body = {
      title: title.trim(),
      slug: slug.trim().toLowerCase(),
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      badgeLabel: badgeLabel.trim() || "SALE",
      homeHeadline: homeHeadline.trim() || "Flash Cut",
      bannerCtaLabel: bannerCtaLabel.trim() || "Shop The Sale",
      bannerCtaHref: bannerCtaHref.trim() || `/sale/${slug.trim().toLowerCase()}`,
      bannerCtaPosition,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      banner,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      isActive,
      showOnHome,
      showInNav,
      allowCoupons,
      priority: Number(priority),
      homeLimit: Number(homeLimit),
      defaultDiscountType,
      defaultDiscountValue: Number(defaultDiscountValue),
      items: items.map((item) => ({
        product: item._id,
        discountType: item.discountType,
        value: Number(item.value),
      })),
    };

    try {
      const url = isEdit ? `/api/admin/sales/${saleId}` : "/api/admin/sales";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        const replaced = savedPublicId.current;
        if (replaced && replaced !== banner?.publicId) {
          await deleteFromStorage(replaced);
        }
        savedPublicId.current = banner?.publicId ?? null;
        toast(isEdit ? "Sale updated" : "Sale created", "success");
        router.push("/admin/sales");
      } else {
        setError(json.error || json.message || "Failed to save sale");
      }
    } catch {
      setError("Failed to save sale");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <AdminFormSkeleton sections={4} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-admin-danger-line bg-admin-danger-soft px-4 py-3 text-sm text-admin-danger">
          {error}
        </div>
      )}

      <nav aria-label="Sale form sections" className="sticky top-0 z-20 -mx-1 overflow-x-auto border-y border-admin-line bg-admin-canvas/95 px-1 py-2 backdrop-blur">
        <ol className="flex min-w-max items-center gap-1 text-sm">
          {[
            ["campaign", "1. Campaign"],
            ["schedule", "2. Schedule"],
            ["banner", "3. Banner"],
            ["products", "4. Products"],
            ["seo", "5. SEO"],
          ].map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="inline-flex min-h-9 items-center rounded-lg px-3 font-medium text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="campaign" className="scroll-mt-20 rounded-xl border border-admin-line bg-admin-surface p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-admin-heading">Campaign details</h2>
          <p className="mt-1 text-sm text-admin-muted">Name the campaign and set the public landing URL.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Title</span>
            <input
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
              placeholder="Monsoon Flash Cut"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Sale URL</span>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="w-full rounded-lg border border-admin-line px-3 py-2 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-admin-faint">Storefront path: {saleUrl}</p>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-admin-body">Subtitle</span>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
              placeholder="Apex kit, weekend pricing"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1.5 block font-medium text-admin-body">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
        </div>
      </section>

      <section id="schedule" className="scroll-mt-20 rounded-xl border border-admin-line bg-admin-surface p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-admin-heading">Schedule & merchandising</h2>
          <p className="mt-1 text-sm text-admin-muted">Set the live window, storefront placements, and campaign priority.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Starts</span>
            <input
              required
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Ends</span>
            <input
              required
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Badge</span>
            <input
              value={badgeLabel}
              onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
              maxLength={24}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Home headline</span>
            <input
              value={homeHeadline}
              onChange={(e) => setHomeHeadline(e.target.value)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Priority</span>
            <input
              type="number"
              min={0}
              max={1000}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Home product count</span>
            <input
              type="number"
              min={1}
              max={12}
              value={homeLimit}
              onChange={(e) => setHomeLimit(Number(e.target.value))}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showOnHome} onChange={(e) => setShowOnHome(e.target.checked)} />
            Show on home
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={showInNav} onChange={(e) => setShowInNav(e.target.checked)} />
            Show in header
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={allowCoupons} onChange={(e) => setAllowCoupons(e.target.checked)} />
            Allow coupon stacking
          </label>
        </div>
      </section>

      <section id="banner" className="scroll-mt-20 rounded-xl border border-admin-line bg-admin-surface p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-admin-heading">Banner</h2>
            <p className="mt-1 text-sm text-admin-muted">Preview the exact sale-page scrim and position the homepage CTA.</p>
          </div>
          {banner?.url && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRawBanner((prev) => !prev)}
                aria-pressed={showRawBanner}
                className="rounded-lg border border-admin-line px-3 py-1.5 text-xs font-medium text-admin-body hover:bg-admin-hover"
              >
                {showRawBanner ? "Show storefront view" : "Show original"}
              </button>
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-admin-line px-3 py-1.5 text-xs font-medium text-admin-body hover:bg-admin-hover disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Replace image"}
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveBanner()}
                disabled={uploading}
                className="rounded-lg border border-admin-danger-line px-3 py-1.5 text-xs font-medium text-admin-danger hover:bg-admin-danger-soft disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        <input
          ref={bannerInputRef}
          type="file"
          accept={BANNER_MIME_TYPES.join(",")}
          onChange={handleImageUpload}
          disabled={uploading}
          className="hidden"
        />

        {banner?.url ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleBannerDrop}
            className={`relative aspect-[16/9] min-h-[16rem] overflow-hidden rounded-lg border ${
              dragActive ? "border-admin-heading" : "border-admin-line"
            }`}
          >
            <Image
              key={banner.url}
              src={banner.url}
              alt="Sale banner preview"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 60vw, 100vw"
            />
            {!showRawBanner && (
              <>
                {STOREFRONT_SCRIMS.map((scrim) => (
                  <div key={scrim} className={`absolute inset-0 ${scrim}`} />
                ))}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07070a] to-transparent" />
              </>
            )}
            <div className={bannerCtaPositionClass(bannerCtaPosition, true)}>
              <span className="btn-text inline-flex items-center gap-2 bg-[#e32d22] px-7 py-3.5 text-white">
                {bannerCtaLabel.trim() || "Shop The Sale"}
                <ArrowRight size={14} />
              </span>
            </div>
            {(uploading || dragActive) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white">
                {uploading ? "Uploading…" : "Drop to replace"}
              </div>
            )}
          </div>
        ) : (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleBannerDrop}
            className={`flex aspect-[16/9] min-h-[16rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-center transition-colors ${
              dragActive
                ? "border-admin-heading bg-admin-hover"
                : "border-admin-line hover:border-admin-line-strong hover:bg-admin-hover"
            }`}
          >
            <input
              type="file"
              accept={BANNER_MIME_TYPES.join(",")}
              onChange={handleImageUpload}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-admin-line border-t-gray-900" />
            ) : (
              <>
                <span className="text-sm font-medium text-admin-body">
                  Click to upload or drop an image
                </span>
                <span className="text-xs text-admin-faint">
                  16:9 JPG, PNG, WebP or AVIF — up to 10 MB
                </span>
              </>
            )}
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">CTA label</span>
            <input
              value={bannerCtaLabel}
              onChange={(e) => setBannerCtaLabel(e.target.value)}
              maxLength={40}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
              placeholder="Shop The Sale"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">CTA link</span>
            <input
              value={bannerCtaHref}
              onChange={(e) => setBannerCtaHref(e.target.value)}
              maxLength={300}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
              placeholder={saleUrl}
            />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-admin-body">CTA position</span>
            <div className="grid w-36 grid-cols-3 gap-1.5">
              {BANNER_CTA_POSITIONS.map((position) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => setBannerCtaPosition(position)}
                  className={`h-8 rounded border ${
                    bannerCtaPosition === position
                      ? "border-admin-heading bg-admin-heading"
                      : "border-admin-line bg-admin-subtle hover:bg-admin-hover"
                  }`}
                  aria-label={position.replaceAll("-", " ")}
                  aria-pressed={bannerCtaPosition === position}
                  title={position.replaceAll("-", " ")}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-admin-faint">
              {bannerCtaPosition.replaceAll("-", " ")}
            </p>
          </div>
        </div>
        <p className="text-xs text-admin-faint">
          Headline stays in the image. The CTA button overlays the homepage hero at the same size and style.
          {banner?.url
            ? " The preview carries the same dark scrim the sale page paints over the artwork so hero copy stays legible — the homepage hero shows the image undimmed."
            : ""}
        </p>
      </section>

      <section id="products" className="scroll-mt-20 rounded-xl border border-admin-line bg-admin-surface p-5 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-admin-heading">Discount & products</h2>
            <p className="mt-1 text-sm text-admin-muted">Add up to {MAX_SALE_ITEMS} products, then tune any product override.</p>
          </div>
          <button
            type="button"
            onClick={applyDefaultToAll}
            className="text-xs font-medium text-admin-muted hover:text-admin-heading"
          >
            Apply default to all items
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Default discount</span>
            <select
              value={defaultDiscountType}
              onChange={(e) => setDefaultDiscountType(e.target.value as DiscountType)}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            >
              <option value="percentage">Percentage off</option>
              <option value="amount">Flat ₹ off (ex-GST)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-admin-body">Default value</span>
            <input
              type="number"
              min={defaultDiscountType === "percentage" ? 1 : 0.01}
              max={defaultDiscountType === "percentage" ? 90 : undefined}
              step="any"
              value={defaultDiscountValue}
              onChange={(e) => setDefaultDiscountValue(Number(e.target.value))}
              className="w-full rounded-lg border border-admin-line px-3 py-2"
            />
          </label>
        </div>

        <div className="relative">
          <input
            aria-label="Search products to add"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products to add…"
            className="w-full rounded-lg border border-admin-line px-3 py-2 text-sm"
          />
          {(searching || searchResults.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-admin-line bg-admin-surface shadow-lg">
              {searching && <p className="px-3 py-2 text-xs text-admin-faint">Searching…</p>}
              {searchResults.map((product) => (
                <button
                  type="button"
                  key={product._id}
                  onClick={() => addProduct(product)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-admin-hover"
                >
                  <ProductThumb url={product.images?.[0]?.url} title={product.title} />
                  <span className="text-sm text-admin-body">{product.title}</span>
                  {itemIds.has(product._id) && (
                    <span className="ml-auto text-[11px] text-admin-faint">Added</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-admin-line bg-admin-subtle/50 p-4">
          <div>
            <p className="text-sm font-medium text-admin-body">Add from a collection</p>
            <p className="mt-0.5 text-xs text-admin-faint">
              Ready-made merchandising groups so you can build a sale from demand, inventory, or category.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {collections.map((collection) => (
              <button
                key={collection.key}
                type="button"
                onClick={() => void loadCollection(collection.key)}
                aria-pressed={activeCollection === collection.key}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  activeCollection === collection.key
                    ? "border-admin-heading bg-admin-heading text-white"
                    : "border-admin-line bg-admin-surface text-admin-body hover:bg-admin-hover"
                }`}
              >
                {collection.label}
              </button>
            ))}
          </div>
          {categories.length > 0 && (
            <label className="block max-w-xs text-sm">
              <span className="mb-1.5 block text-xs font-medium text-admin-muted">Category</span>
              <select
                value={categoryId}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategoryId(next);
                  if (next) void loadCollection("category", next);
                  else if (activeCollection === "category") void loadCollection("");
                }}
                className="w-full rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-sm"
              >
                <option value="">Choose a category…</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {(activeCollection || collectionLoading) && (
            <div className="rounded-lg border border-admin-line bg-admin-surface">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-admin-line px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-admin-heading">
                    {collectionMeta?.label || "Collection"}
                  </p>
                  <p className="text-xs text-admin-faint">
                    {collectionLoading
                      ? "Loading products…"
                      : collectionMeta?.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPickedIds(
                        collectionItems
                          .filter((product) => !itemIds.has(product._id))
                          .map((product) => product._id)
                      )
                    }
                    className="text-xs font-medium text-admin-muted hover:text-admin-heading"
                  >
                    Select new
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickedIds(collectionItems.map((product) => product._id))}
                    className="text-xs font-medium text-admin-muted hover:text-admin-heading"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const selected = collectionItems.filter((product) =>
                        pickedIds.includes(product._id)
                      );
                      addProducts(selected);
                    }}
                    disabled={collectionLoading || pickedIds.length === 0}
                    className="rounded-lg bg-admin-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Add selected ({pickedIds.filter((id) => !itemIds.has(id)).length})
                  </button>
                </div>
              </div>
              {collectionLoading ? (
                <p className="px-3 py-8 text-center text-sm text-admin-faint">Loading…</p>
              ) : collectionItems.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-admin-faint">
                  No matching products in this collection yet.
                </p>
              ) : (
                <ul className="max-h-72 overflow-auto divide-y divide-admin-line">
                  {collectionItems.map((product) => {
                    const checked = pickedIds.includes(product._id);
                    const already = itemIds.has(product._id);
                    return (
                      <li key={product._id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-admin-hover">
                          <input
                            type="checkbox"
                            checked={checked}
                            aria-label={`Select ${product.title}`}
                            onChange={(e) => {
                              setPickedIds((prev) =>
                                e.target.checked
                                  ? [...prev, product._id]
                                  : prev.filter((id) => id !== product._id)
                              );
                            }}
                          />
                          <ProductThumb url={product.images?.[0]?.url} title={product.title} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-admin-body">
                              {product.title}
                            </span>
                            {already && (
                              <span className="text-[11px] text-admin-faint">Already in sale</span>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-admin-faint">
          {items.length} / {MAX_SALE_ITEMS} products in this sale
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-line text-left text-admin-muted">
                <th scope="col" className="py-2 font-medium">Product</th>
                <th scope="col" className="py-2 font-medium">Type</th>
                <th scope="col" className="py-2 font-medium">Value</th>
                <th scope="col" className="py-2 font-medium">From / sale</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const active = (item.variants || []).filter((v) => v.isActive !== false);
                const lowest = active.length
                  ? Math.min(...active.map((v) => priceInclGst(v.price, v.gst)))
                  : 0;
                const saleEx = active.length
                  ? Math.min(
                      ...active.map((v) =>
                        previewSalePrice(v.price, item.discountType, item.value)
                      )
                    )
                  : 0;
                const gst = active[0]?.gst;
                const saleIncl = priceInclGst(saleEx, gst);
                return (
                  <tr key={item._id} className="border-b border-admin-line">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        <ProductThumb url={item.images?.[0]?.url} title={item.title} />
                        <span className="min-w-0">
                          <span className="block font-medium text-admin-body">{item.title}</span>
                          {item.slug && (
                            <span className="block text-[11px] text-admin-faint">{item.slug}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={item.discountType}
                        aria-label={`Discount type for ${item.title}`}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = {
                            ...item,
                            discountType: e.target.value as DiscountType,
                          };
                          setItems(next);
                        }}
                        className="rounded border border-admin-line px-2 py-1"
                      >
                        <option value="percentage">%</option>
                        <option value="amount">₹ off</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        aria-label={`Discount value for ${item.title}`}
                        min={item.discountType === "percentage" ? 1 : 0.01}
                        max={item.discountType === "percentage" ? 90 : undefined}
                        step="any"
                        value={item.value}
                        onChange={(e) => {
                          const next = [...items];
                          next[index] = { ...item, value: Number(e.target.value) };
                          setItems(next);
                        }}
                        className="w-24 rounded border border-admin-line px-2 py-1"
                      />
                    </td>
                    <td className="py-2 pr-3 text-admin-muted">
                      ₹{Math.round(lowest)} → ₹{Math.round(saleIncl)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((p) => p._id !== item._id))}
                        aria-label={`Remove ${item.title} from sale`}
                        className="text-xs text-admin-danger"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-admin-faint">No products selected yet.</p>
          )}
        </div>
      </section>

      <section id="seo" className="scroll-mt-20 rounded-xl border border-admin-line bg-admin-surface p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-admin-heading">Search appearance</h2>
          <p className="mt-1 text-sm text-admin-muted">Optional metadata for the public sale landing page.</p>
        </div>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-admin-body">SEO title</span>
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            className="w-full rounded-lg border border-admin-line px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-admin-body">SEO description</span>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-admin-line px-3 py-2"
          />
        </label>
      </section>

      <div className="sticky bottom-0 z-20 flex flex-wrap justify-end gap-2 border-t border-admin-line bg-admin-canvas/95 py-3 backdrop-blur">
        <Button type="button" variant="secondary" onClick={() => void handleCancel()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading ? "Saving…" : isEdit ? "Update sale" : "Launch sale"}
        </Button>
      </div>
    </form>
  );
}
