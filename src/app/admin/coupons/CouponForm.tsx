"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

interface CouponFormProps {
  couponId?: string;
}

interface PickedProduct {
  _id: string;
  title: string;
  slug: string;
  images: { url: string }[];
}

interface CollectionOption {
  key: string;
  label: string;
  description: string;
}

interface CollectionCategory {
  _id: string;
  name: string;
}

const MAX_COUPON_PRODUCTS = 100;

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

export default function CouponForm({ couponId }: CouponFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = !!couponId;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "flat">("percentage");
  const [value, setValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxDiscount, setMaxDiscount] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState("");
  const [usageLimit, setUsageLimit] = useState<number>(100);
  const [perUserLimit, setPerUserLimit] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);
  const [products, setProducts] = useState<PickedProduct[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PickedProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [categories, setCategories] = useState<CollectionCategory[]>([]);
  const [activeCollection, setActiveCollection] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [collectionMeta, setCollectionMeta] = useState<CollectionOption | null>(null);
  const [collectionItems, setCollectionItems] = useState<PickedProduct[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/coupons/product-collections")
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setCollections(json.data.collections || []);
        setCategories(json.data.categories || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    fetch(`/api/admin/coupons/${couponId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const c = json.data;
          setCode(c.code);
          setDescription(c.description || "");
          setType(c.type);
          setValue(c.value);
          setMinOrderValue(c.minOrderValue);
          setMaxDiscount(c.maxDiscount != null ? String(c.maxDiscount) : "");
          setExpiresAt(c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : "");
          setUsageLimit(c.usageLimit);
          setPerUserLimit(c.perUserLimit);
          setIsActive(c.isActive);
          setProducts(
            (c.applicableProducts || [])
              .map((row: PickedProduct | string) =>
                typeof row === "object" && row && "_id" in row ? row : null
              )
              .filter(Boolean) as PickedProduct[]
          );
        } else {
          setError(json.message || "Failed to load coupon");
        }
      })
      .catch(() => setError("Failed to load coupon"))
      .finally(() => setFetching(false));
  }, [isEdit, couponId]);

  const productIds = useMemo(() => new Set(products.map((p) => p._id)), [products]);

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
        setSearchResults(json.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void searchProducts(search), 280);
    return () => window.clearTimeout(id);
  }, [search, searchProducts]);

  const addProducts = useCallback(
    (incoming: PickedProduct[], options?: { fromSearch?: boolean }) => {
      const fresh = incoming.filter((product) => !productIds.has(product._id));
      if (fresh.length === 0) {
        if (!options?.fromSearch) toast("Those products are already selected", "error");
        return;
      }
      const room = MAX_COUPON_PRODUCTS - products.length;
      if (room <= 0) {
        toast(`A coupon can target at most ${MAX_COUPON_PRODUCTS} products`, "error");
        return;
      }
      const accepted = fresh.slice(0, room);
      const acceptedIds = new Set(accepted.map((product) => product._id));
      setProducts((prev) => [...prev, ...accepted]);
      setPickedIds((prev) => prev.filter((id) => !acceptedIds.has(id)));
      if (accepted.length < fresh.length) {
        toast(`Added ${accepted.length} products. Limit is ${MAX_COUPON_PRODUCTS}.`, "error");
      }
      if (options?.fromSearch) {
        setSearch("");
        setSearchResults([]);
      }
    },
    [productIds, products.length, toast]
  );

  const loadCollection = useCallback(
    async (key: string, nextCategoryId?: string) => {
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
        const res = await fetch(`/api/admin/coupons/product-collections?${params}`);
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
    },
    [toast]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body = {
      code: code.toUpperCase(),
      description: description || undefined,
      type,
      value: Number(value),
      minOrderValue: Number(minOrderValue),
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      expiresAt: new Date(expiresAt).toISOString(),
      usageLimit: Number(usageLimit),
      perUserLimit: Number(perUserLimit),
      isActive,
      applicableProducts: products.map((p) => p._id),
    };
    try {
      const url = isEdit ? `/api/admin/coupons/${couponId}` : "/api/admin/coupons";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) router.push("/admin/coupons");
      else setError(json.message || "Failed to save coupon");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <AdminFormSkeleton sections={3} />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-lg border border-admin-danger-line bg-admin-danger-soft px-3.5 py-3 text-sm text-admin-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <FormSection title="Coupon details" description="Set the code customers enter and the discount it applies.">
            <TextField
              id="coupon-code"
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              maxLength={40}
              className="font-mono uppercase"
              placeholder="SAVE20"
              hint="Codes are always stored in uppercase."
            />
            <SelectField
              id="coupon-type"
              label="Discount type"
              value={type}
              onChange={(e) => setType(e.target.value as "percentage" | "flat")}
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat amount (₹)</option>
            </SelectField>
            <div className="sm:col-span-2">
              <TextAreaField
                id="coupon-description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Optional internal description"
              />
            </div>
            <TextField
              id="coupon-value"
              label={`Value ${type === "percentage" ? "(%)" : "(₹)"}`}
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              required
              min={0}
              max={type === "percentage" ? 100 : undefined}
              step="any"
            />
            <TextField
              id="coupon-minimum"
              label="Minimum order value (₹)"
              type="number"
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(Number(e.target.value))}
              min={0}
              step="any"
              hint={
                products.length > 0
                  ? "Applies to the subtotal of selected products only."
                  : "Use 0 when there is no minimum."
              }
            />
            {type === "percentage" && (
              <TextField
                id="coupon-max-discount"
                label="Maximum discount (₹)"
                type="number"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                min={0}
                step="any"
                placeholder="No limit"
                hint="Optional cap for percentage discounts."
              />
            )}
          </FormSection>

          <FormSection
            title="Applicable products"
            description="Leave empty to apply storewide. Or pick specific products — same merchandising groups used for sales."
            columns={1}
          >
            <div className="relative">
              <input
                aria-label="Search products to add"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products to add…"
                className="w-full rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-sm"
              />
              {(searching || searchResults.length > 0) && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-admin-line bg-admin-surface shadow-lg">
                  {searching && <p className="px-3 py-2 text-xs text-admin-faint">Searching…</p>}
                  {searchResults.map((product) => (
                    <button
                      type="button"
                      key={product._id}
                      onClick={() => addProducts([product], { fromSearch: true })}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-admin-hover"
                    >
                      <ProductThumb url={product.images?.[0]?.url} title={product.title} />
                      <span className="text-sm text-admin-body">{product.title}</span>
                      {productIds.has(product._id) && (
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
                  Ready-made merchandising groups so you can scope a coupon from demand, inventory, or category.
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
                        {collectionLoading ? "Loading products…" : collectionMeta?.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPickedIds(
                            collectionItems
                              .filter((product) => !productIds.has(product._id))
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
                        Add selected ({pickedIds.filter((id) => !productIds.has(id)).length})
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
                        const already = productIds.has(product._id);
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
                                  <span className="text-[11px] text-admin-faint">Already added</span>
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
              {products.length === 0
                ? "No product restriction — coupon applies to the whole cart."
                : `${products.length} / ${MAX_COUPON_PRODUCTS} products targeted`}
            </p>

            {products.length > 0 && (
              <ul className="divide-y divide-admin-line rounded-lg border border-admin-line">
                {products.map((product) => (
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
                      onClick={() =>
                        setProducts((prev) => prev.filter((p) => p._id !== product._id))
                      }
                      className="text-xs font-medium text-admin-muted hover:text-admin-danger"
                      aria-label={`Remove ${product.title}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection title="Redemption limits" description="Control when the code expires and how often it can be used.">
            <TextField
              id="coupon-expiry"
              label="Expires at"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
            />
            <TextField
              id="coupon-usage-limit"
              label="Total usage limit"
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(Number(e.target.value))}
              required
              min={1}
            />
            <TextField
              id="coupon-per-user-limit"
              label="Per-customer limit"
              type="number"
              value={perUserLimit}
              onChange={(e) => setPerUserLimit(Number(e.target.value))}
              min={1}
            />
          </FormSection>
        </div>

        <FormSection
          title="Availability"
          description="Choose whether customers can redeem this code."
          columns={1}
          className="h-fit"
        >
          <CheckboxField
            id="coupon-active"
            label="Active"
            hint="Inactive coupons remain saved but cannot be redeemed."
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </FormSection>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-admin-line bg-admin-canvas/95 py-3 backdrop-blur">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Coupon" : "Create Coupon"}
        </Button>
        <Button variant="secondary" onClick={() => router.push("/admin/coupons")}>Cancel</Button>
      </div>
    </form>
  );
}
