import type { ProductData } from "@/lib/store-api";

const STORAGE_KEY = "motoego_recently_viewed";
const MAX_ITEMS = 8;

export type RecentlyViewedProduct = Pick<
  ProductData,
  "_id" | "title" | "slug" | "images" | "variants"
> &
  Partial<Pick<ProductData, "category" | "tags" | "isFeatured" | "createdAt">> & {
    viewedAt: number;
  };

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getRecentlyViewed(): RecentlyViewedProduct[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentlyViewedProduct =>
        Boolean(item && typeof item === "object" && item._id && item.slug && item.title)
    );
  } catch {
    return [];
  }
}

export function trackRecentlyViewed(
  product: Pick<
    ProductData,
    "_id" | "title" | "slug" | "images" | "variants"
  > &
    Partial<Pick<ProductData, "category" | "tags" | "isFeatured" | "createdAt">>
) {
  if (!canUseStorage() || !product?._id) return;

  const entry: RecentlyViewedProduct = {
    _id: product._id,
    title: product.title,
    slug: product.slug,
    images: product.images ?? [],
    variants: product.variants ?? [],
    category: product.category,
    tags: product.tags,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    viewedAt: Date.now(),
  };

  const existing = getRecentlyViewed().filter((item) => item._id !== entry._id);
  const next = [entry, ...existing].slice(0, MAX_ITEMS);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode failures
  }
}
