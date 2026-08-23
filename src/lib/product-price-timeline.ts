import { Types } from "mongoose";
import { computeSalePrice, campaignStatus } from "@/lib/sales";
import type { SaleDiscountType } from "@/models/sale-campaign.model";
import { inclusivePrice } from "@/lib/product-price-history";

type VariantSnapshot = {
  _id: Types.ObjectId;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  gst?: number;
  isActive?: boolean;
};

type BaseHistoryRow = {
  _id?: Types.ObjectId;
  effectiveAt: Date;
  price: number;
  gst: number;
  variant: Types.ObjectId;
  variantLabel: string;
  sku: string;
  compareAtPrice?: number;
  source: "initial" | "update";
  changedBy?: string;
};

type SaleCampaignRow = {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  priority: number;
  items: {
    product: Types.ObjectId;
    discountType: SaleDiscountType;
    value: number;
  }[];
};

export type EffectivePriceSource = "initial" | "update" | "sale" | "sale_end";

export interface EffectivePriceEvent {
  _id: string;
  variant: Types.ObjectId;
  variantLabel: string;
  sku: string;
  price: number;
  gst: number;
  compareAtPrice?: number;
  priceInclGst: number;
  effectiveAt: Date;
  source: EffectivePriceSource;
  changedBy?: string;
  saleTitle?: string;
  saleSlug?: string;
  originalPrice?: number;
  originalPriceInclGst?: number;
}

export interface PriceTimelinePoint {
  label: string;
  date: string;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  hasSale: boolean;
}

function variantLabel(variant: VariantSnapshot): string {
  const parts = [variant.color, variant.size].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : variant.sku;
}

function isCampaignLiveAt(
  campaign: Pick<SaleCampaignRow, "isActive" | "startsAt" | "endsAt">,
  at: Date
): boolean {
  if (!campaign.isActive) return false;
  const time = at.getTime();
  return (
    time >= new Date(campaign.startsAt).getTime() &&
    time < new Date(campaign.endsAt).getTime()
  );
}

function saleForProductAt(
  campaigns: SaleCampaignRow[],
  productId: string,
  at: Date
): { discountType: SaleDiscountType; value: number; title: string; slug: string } | null {
  const live = campaigns
    .filter((campaign) => {
      if (!isCampaignLiveAt(campaign, at)) return false;
      return campaign.items.some((item) => String(item.product) === productId);
    })
    .sort((a, b) => b.priority - a.priority || b.startsAt.getTime() - a.startsAt.getTime());

  const winner = live[0];
  if (!winner) return null;

  const item = winner.items.find((entry) => String(entry.product) === productId);
  if (!item) return null;

  return {
    discountType: item.discountType,
    value: item.value,
    title: winner.title,
    slug: winner.slug,
  };
}

function basePriceAt(
  history: BaseHistoryRow[],
  variantId: string,
  at: Date
): { price: number; gst: number } | null {
  const entries = history
    .filter((entry) => String(entry.variant) === variantId)
    .filter((entry) => new Date(entry.effectiveAt).getTime() <= at.getTime())
    .sort(
      (a, b) =>
        new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime()
    );

  const latest = entries[entries.length - 1];
  if (!latest) return null;
  return { price: latest.price, gst: latest.gst };
}

function effectiveVariantPrice(
  base: { price: number; gst: number },
  sale: { discountType: SaleDiscountType; value: number } | null
): number {
  if (!sale) return base.price;
  const salePrice = computeSalePrice(base.price, sale.discountType, sale.value);
  if (salePrice <= 0 || salePrice >= base.price) return base.price;
  return salePrice;
}

type TimelineEvent =
  | {
      at: Date;
      kind: "base";
      entry: BaseHistoryRow;
    }
  | {
      at: Date;
      kind: "sale_start" | "sale_end";
      campaign: SaleCampaignRow;
      item: SaleCampaignRow["items"][number];
    };

function buildTimelineEvents(
  productId: string,
  baseHistory: BaseHistoryRow[],
  campaigns: SaleCampaignRow[]
): TimelineEvent[] {
  const events: TimelineEvent[] = baseHistory.map((entry) => ({
    at: new Date(entry.effectiveAt),
    kind: "base" as const,
    entry,
  }));

  for (const campaign of campaigns) {
    const item = campaign.items.find((entry) => String(entry.product) === productId);
    if (!item) continue;

    events.push({
      at: new Date(campaign.startsAt),
      kind: "sale_start",
      campaign,
      item,
    });
    events.push({
      at: new Date(campaign.endsAt),
      kind: "sale_end",
      campaign,
      item,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function buildEffectivePriceHistory(
  productId: string,
  variants: VariantSnapshot[],
  baseHistory: BaseHistoryRow[],
  campaigns: SaleCampaignRow[]
): EffectivePriceEvent[] {
  const activeVariants = variants.filter((variant) => variant.isActive !== false);
  const events = buildTimelineEvents(productId, baseHistory, campaigns);
  const output: EffectivePriceEvent[] = [];

  const baseByVariant = new Map<string, { price: number; gst: number }>();

  for (const event of events) {
    if (event.kind === "base") {
      const { entry } = event;
      baseByVariant.set(String(entry.variant), {
        price: entry.price,
        gst: entry.gst,
      });

      const sale = saleForProductAt(campaigns, productId, event.at);
      const base = { price: entry.price, gst: entry.gst };
      const effective = effectiveVariantPrice(base, sale);

      output.push({
        _id: String(entry._id ?? `${entry.variant}-${event.at.toISOString()}`),
        variant: entry.variant,
        variantLabel: entry.variantLabel,
        sku: entry.sku,
        price: effective,
        gst: entry.gst,
        compareAtPrice:
          sale && effective < entry.price ? entry.price : entry.compareAtPrice,
        priceInclGst: inclusivePrice(effective, entry.gst),
        effectiveAt: event.at,
        source: entry.source,
        changedBy: entry.changedBy,
        saleTitle: sale?.title,
        saleSlug: sale?.slug,
        originalPrice: sale && effective < entry.price ? entry.price : undefined,
        originalPriceInclGst:
          sale && effective < entry.price
            ? inclusivePrice(entry.price, entry.gst)
            : undefined,
      });
      continue;
    }

    const { campaign, item } = event;
    const saleMeta =
      event.kind === "sale_start"
        ? {
            discountType: item.discountType,
            value: item.value,
            title: campaign.title,
            slug: campaign.slug,
          }
        : null;

    for (const variant of activeVariants) {
      const variantId = String(variant._id);
      const base =
        baseByVariant.get(variantId) ??
        basePriceAt(baseHistory, variantId, event.at) ?? {
          price: variant.price,
          gst: typeof variant.gst === "number" ? variant.gst : 18,
        };

      if (!baseByVariant.has(variantId)) {
        baseByVariant.set(variantId, base);
      }

      const activeSale =
        event.kind === "sale_start"
          ? saleMeta
          : saleForProductAt(
              campaigns.filter((entry) => String(entry._id) !== String(campaign._id)),
              productId,
              event.at
            );

      const effective = effectiveVariantPrice(base, activeSale);
      const gst = base.gst;
      const onSale = Boolean(activeSale && effective < base.price);

      output.push({
        _id: `${event.kind}-${campaign._id}-${variantId}-${event.at.toISOString()}`,
        variant: variant._id,
        variantLabel: variantLabel(variant),
        sku: variant.sku,
        price: effective,
        gst,
        compareAtPrice: onSale ? base.price : undefined,
        priceInclGst: inclusivePrice(effective, gst),
        effectiveAt: event.at,
        source: event.kind === "sale_start" ? "sale" : "sale_end",
        saleTitle: activeSale?.title ?? campaign.title,
        saleSlug: activeSale?.slug ?? campaign.slug,
        originalPrice: onSale ? base.price : undefined,
        originalPriceInclGst: onSale ? inclusivePrice(base.price, gst) : undefined,
      });
    }
  }

  return output.sort(
    (a, b) => new Date(a.effectiveAt).getTime() - new Date(b.effectiveAt).getTime()
  );
}

export function buildEffectivePriceTimeline(
  productId: string,
  variants: VariantSnapshot[],
  effectiveHistory: EffectivePriceEvent[]
): PriceTimelinePoint[] {
  const activeVariants = variants.filter((variant) => variant.isActive !== false);
  if (activeVariants.length === 0 || effectiveHistory.length === 0) return [];

  const timestamps = [...new Set(effectiveHistory.map((entry) => entry.effectiveAt.toISOString()))]
    .sort()
    .map((iso) => new Date(iso));

  const latestByVariant = new Map<string, EffectivePriceEvent>();
  let cursor = 0;
  const points: PriceTimelinePoint[] = [];

  for (const at of timestamps) {
    while (
      cursor < effectiveHistory.length &&
      new Date(effectiveHistory[cursor].effectiveAt).getTime() <= at.getTime()
    ) {
      const entry = effectiveHistory[cursor];
      latestByVariant.set(String(entry.variant), entry);
      cursor += 1;
    }

    const inclPrices = activeVariants
      .map((variant) => latestByVariant.get(String(variant._id)))
      .filter((entry): entry is EffectivePriceEvent => Boolean(entry))
      .map((entry) => entry.priceInclGst);

    if (inclPrices.length === 0) continue;

    const hasSale = [...latestByVariant.values()].some(
      (entry) => entry.source === "sale" || Boolean(entry.originalPrice)
    );

    points.push({
      label: at.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      date: at.toISOString(),
      minPrice: Math.min(...inclPrices),
      maxPrice: Math.max(...inclPrices),
      avgPrice:
        Math.round(
          (inclPrices.reduce((sum, price) => sum + price, 0) / inclPrices.length) * 100
        ) / 100,
      hasSale,
    });
  }

  return points;
}

export function currentEffectivePrices(
  productId: string,
  variants: VariantSnapshot[],
  campaigns: SaleCampaignRow[],
  now = new Date()
) {
  const activeVariants = variants.filter((variant) => variant.isActive !== false);
  const sale = saleForProductAt(campaigns, productId, now);

  const inclPrices = activeVariants.map((variant) => {
    const gst = typeof variant.gst === "number" ? variant.gst : 18;
    const base = variant.price;
    const effective = effectiveVariantPrice({ price: base, gst }, sale);
    return inclusivePrice(effective, gst);
  });

  return {
    minPrice: inclPrices.length > 0 ? Math.min(...inclPrices) : 0,
    maxPrice: inclPrices.length > 0 ? Math.max(...inclPrices) : 0,
    onSale: Boolean(sale),
    sale,
  };
}

export function buildSingleVariantPriceTimeline(
  variantId: string,
  effectiveHistory: EffectivePriceEvent[]
): Array<{
  label: string;
  date: string;
  priceInclGst: number;
  priceExGst: number;
  hasSale: boolean;
}> {
  const entries = effectiveHistory.filter(
    (entry) => String(entry.variant) === variantId
  );
  if (entries.length === 0) return [];

  const byTimestamp = new Map<string, EffectivePriceEvent>();
  for (const entry of entries) {
    byTimestamp.set(entry.effectiveAt.toISOString(), entry);
  }

  return [...byTimestamp.entries()]
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([, entry]) => {
      const at = new Date(entry.effectiveAt);
      return {
        label: at.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        date: at.toISOString(),
        priceInclGst: entry.priceInclGst,
        priceExGst: entry.price,
        hasSale: entry.source === "sale" || Boolean(entry.originalPrice),
      };
    });
}

export function getVariantPricing(
  variant: VariantSnapshot,
  productId: string,
  campaigns: SaleCampaignRow[],
  now = new Date()
) {
  const gst = typeof variant.gst === "number" ? variant.gst : 18;
  const sale = saleForProductAt(campaigns, productId, now);
  const baseExGst = variant.price;
  const effectiveExGst = effectiveVariantPrice({ price: baseExGst, gst }, sale);
  const onSale = effectiveExGst < baseExGst;

  return {
    priceExGst: effectiveExGst,
    priceInclGst: inclusivePrice(effectiveExGst, gst),
    basePriceExGst: baseExGst,
    basePriceInclGst: inclusivePrice(baseExGst, gst),
    gst,
    onSale,
    saleTitle: onSale ? sale?.title : undefined,
  };
}

export function labelVariant(variant: VariantSnapshot): string {
  return variantLabel(variant);
}

export function activeSaleCampaignsForProduct(
  productId: string,
  campaigns: SaleCampaignRow[],
  now = new Date()
) {
  return campaigns
    .filter((campaign) => {
      if (!campaign.items.some((item) => String(item.product) === productId)) {
        return false;
      }
      return campaignStatus(campaign, now) === "live";
    })
    .sort((a, b) => b.priority - a.priority || b.startsAt.getTime() - a.startsAt.getTime());
}
