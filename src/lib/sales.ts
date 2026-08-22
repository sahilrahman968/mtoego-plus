import { Types } from "mongoose";
import SaleCampaign, {
  type ISaleCampaignDocument,
  type SaleDiscountType,
} from "@/models/sale-campaign.model";
import Product from "@/models/product.model";
import Order, { type IOrderDocument } from "@/models/order.model";

export type SaleCampaignStatus = "paused" | "scheduled" | "live" | "ended";

export interface SaleCampaignMeta {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  badgeLabel: string;
  homeHeadline: string;
  endsAt: Date;
  allowCoupons: boolean;
}

export interface LiveSaleOffer {
  productId: string;
  discountType: SaleDiscountType;
  value: number;
  campaign: SaleCampaignMeta;
}

export interface PricedSaleOffer {
  price: number;
  originalPrice: number;
  offer: LiveSaleOffer;
}

type VariantLike = {
  _id?: unknown;
  price: number;
  compareAtPrice?: number;
  gst?: number;
  isActive?: boolean;
};

type ProductLike = {
  _id: unknown;
  variants?: VariantLike[];
  sale?: {
    campaignId: string;
    slug: string;
    title: string;
    endsAt: string;
    badgeLabel: string;
  };
};

export class SaleIndex {
  private byProduct = new Map<string, LiveSaleOffer>();

  set(offer: LiveSaleOffer) {
    if (!this.byProduct.has(offer.productId)) {
      this.byProduct.set(offer.productId, offer);
    }
  }

  get(productId: string) {
    return this.byProduct.get(String(productId));
  }

  has(productId: string) {
    return this.byProduct.has(String(productId));
  }

  get size() {
    return this.byProduct.size;
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeSalePrice(
  original: number,
  discountType: SaleDiscountType,
  value: number
) {
  if (original <= 0) return original;
  if (discountType === "percentage") {
    return round(original * (1 - Math.min(90, Math.max(0, value)) / 100));
  }
  return round(Math.max(0.01, original - Math.max(0, value)));
}

export function campaignStatus(
  campaign: Pick<ISaleCampaignDocument, "isActive" | "startsAt" | "endsAt">,
  now = new Date()
): SaleCampaignStatus {
  if (!campaign.isActive) return "paused";
  if (now.getTime() < new Date(campaign.startsAt).getTime()) return "scheduled";
  if (now.getTime() >= new Date(campaign.endsAt).getTime()) return "ended";
  return "live";
}

export function liveCampaignFilter(now = new Date()) {
  return {
    isActive: true,
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  };
}

function toMeta(campaign: ISaleCampaignDocument): SaleCampaignMeta {
  return {
    id: campaign._id.toString(),
    slug: campaign.slug,
    title: campaign.title,
    subtitle: campaign.subtitle,
    badgeLabel: campaign.badgeLabel || "SALE",
    homeHeadline: campaign.homeHeadline || campaign.title,
    endsAt: campaign.endsAt,
    allowCoupons: campaign.allowCoupons !== false,
  };
}

export async function loadLiveSaleIndex(now = new Date()): Promise<SaleIndex> {
  const campaigns = await SaleCampaign.find(liveCampaignFilter(now))
    .sort({ priority: -1, startsAt: -1 })
    .lean<ISaleCampaignDocument[]>();

  const index = new SaleIndex();
  for (const campaign of campaigns) {
    const meta = toMeta(campaign as ISaleCampaignDocument);
    for (const item of campaign.items || []) {
      index.set({
        productId: item.product.toString(),
        discountType: item.discountType,
        value: item.value,
        campaign: meta,
      });
    }
  }
  return index;
}

export function resolveUnitPrice(
  index: SaleIndex,
  productId: string,
  originalPrice: number
): { price: number; offer?: LiveSaleOffer } {
  const offer = index.get(productId);
  if (!offer) return { price: originalPrice };
  const salePrice = computeSalePrice(originalPrice, offer.discountType, offer.value);
  if (salePrice <= 0 || salePrice >= originalPrice) return { price: originalPrice };
  return { price: salePrice, offer };
}

export function applySaleToProduct<T extends ProductLike>(
  product: T,
  index: SaleIndex
): T {
  const productId = String(product._id);
  const offer = index.get(productId);
  if (!offer || !Array.isArray(product.variants)) return product;

  let applied = false;
  const variants = product.variants.map((variant) => {
    const original = variant.price;
    const priced = resolveUnitPrice(index, productId, original);
    if (!priced.offer) return variant;
    applied = true;
    return {
      ...variant,
      price: priced.price,
      compareAtPrice: Math.max(variant.compareAtPrice || 0, original),
    };
  });

  if (!applied) return product;

  return {
    ...product,
    variants,
    sale: {
      campaignId: offer.campaign.id,
      slug: offer.campaign.slug,
      title: offer.campaign.title,
      endsAt: new Date(offer.campaign.endsAt).toISOString(),
      badgeLabel: offer.campaign.badgeLabel,
    },
  };
}

export function applySaleToProducts<T extends ProductLike>(
  products: T[],
  index: SaleIndex
) {
  return products.map((product) => applySaleToProduct(product, index));
}

export async function loadHomeSale(now = new Date()) {
  const campaign = await SaleCampaign.findOne({
    isActive: true,
    endsAt: { $gt: now },
    showOnHome: true,
  })
    .sort({ priority: -1, startsAt: -1 })
    .lean<ISaleCampaignDocument | null>();

  if (!campaign) return null;

  const productIds = campaign.items.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  })
    .populate("category", "name slug")
    .select("-__v")
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));
  const ordered = campaign.items
    .map((item) => byId.get(item.product.toString()))
    .filter(Boolean)
    .slice(0, campaign.homeLimit || 5);

  const index = new SaleIndex();
  if (campaignStatus(campaign as ISaleCampaignDocument, now) === "live") {
    const meta = toMeta(campaign as ISaleCampaignDocument);
    for (const item of campaign.items) {
      index.set({
        productId: item.product.toString(),
        discountType: item.discountType,
        value: item.value,
        campaign: meta,
      });
    }
  }

  return {
    campaign: serializePublicCampaign(campaign),
    products: applySaleToProducts(ordered as ProductLike[], index),
  };
}

export function serializePublicCampaign(campaign: ISaleCampaignDocument) {
  return {
    _id: campaign._id.toString(),
    title: campaign.title,
    slug: campaign.slug,
    subtitle: campaign.subtitle || "",
    description: campaign.description || "",
    badgeLabel: campaign.badgeLabel || "SALE",
    homeHeadline: campaign.homeHeadline || campaign.title,
    bannerCtaLabel: campaign.bannerCtaLabel || "Shop The Sale",
    bannerCtaHref: campaign.bannerCtaHref || `/sale/${campaign.slug}`,
    bannerCtaPosition: campaign.bannerCtaPosition || "bottom-left",
    seoTitle: campaign.seoTitle || "",
    seoDescription: campaign.seoDescription || "",
    banner: campaign.banner || null,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    showOnHome: campaign.showOnHome,
    showInNav: campaign.showInNav,
    allowCoupons: campaign.allowCoupons !== false,
    homeLimit: campaign.homeLimit,
    itemCount: campaign.items?.length || 0,
    status: campaignStatus(campaign),
  };
}

export async function loadPublicSaleBySlug(slug: string, now = new Date()) {
  const campaign = await SaleCampaign.findOne({ slug }).lean<ISaleCampaignDocument | null>();
  if (!campaign) return { error: "not_found" as const };
  const status = campaignStatus(campaign, now);
  if (status === "paused") return { error: "unavailable" as const };

  const productIds = campaign.items.map((item) => item.product);
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  })
    .populate("category", "name slug")
    .select("-__v")
    .lean();

  const byId = new Map(products.map((p) => [String(p._id), p]));
  const ordered = campaign.items
    .map((item) => byId.get(item.product.toString()))
    .filter(Boolean);

  const index = new SaleIndex();
  if (status === "live") {
    const meta = toMeta(campaign as ISaleCampaignDocument);
    for (const item of campaign.items) {
      index.set({
        productId: item.product.toString(),
        discountType: item.discountType,
        value: item.value,
        campaign: meta,
      });
    }
  }

  return {
    campaign: serializePublicCampaign(campaign),
    products: applySaleToProducts(ordered as ProductLike[], index),
  };
}

export function cartBlocksCoupons(
  index: SaleIndex,
  productIds: Array<string | Types.ObjectId>
) {
  return productIds.some((id) => {
    const offer = index.get(String(id));
    return offer ? offer.campaign.allowCoupons === false : false;
  });
}

export async function bumpSaleStat(
  campaignId: string,
  field: "views" | "addToCarts",
  amount = 1
) {
  if (!Types.ObjectId.isValid(campaignId)) return;
  await SaleCampaign.updateOne(
    { _id: campaignId },
    { $inc: { [`stats.${field}`]: amount } }
  );
}

export async function recordSalePaymentStats(order: IOrderDocument) {
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, saleStatsRecorded: { $ne: true } },
    { $set: { saleStatsRecorded: true } },
    { new: false }
  );
  if (!claimed) return;

  const totals = new Map<string, { units: number; revenue: number }>();

  for (const item of order.items || []) {
    const campaignId = item.saleCampaign?.toString();
    if (!campaignId) continue;
    const current = totals.get(campaignId) || { units: 0, revenue: 0 };
    current.units += item.quantity;
    current.revenue += item.total;
    totals.set(campaignId, current);
  }

  for (const [campaignId, data] of totals) {
    await SaleCampaign.updateOne(
      { _id: campaignId },
      {
        $inc: {
          "stats.orders": 1,
          "stats.unitsSold": data.units,
          "stats.revenue": round(data.revenue),
        },
      }
    );
  }
}
