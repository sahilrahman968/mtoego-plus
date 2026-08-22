import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { BANNER_CTA_POSITIONS, type BannerCtaPosition } from "@/lib/banner-cta";

export type SaleDiscountType = "percentage" | "amount";

export interface ISaleBanner {
  url: string;
  publicId: string;
  alt?: string;
}

export interface ISaleItem {
  product: Types.ObjectId;
  discountType: SaleDiscountType;
  value: number;
}

export interface ISaleStats {
  views: number;
  addToCarts: number;
  orders: number;
  unitsSold: number;
  revenue: number;
}

export interface ISaleCampaignDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  badgeLabel: string;
  homeHeadline: string;
  bannerCtaLabel?: string;
  bannerCtaHref?: string;
  bannerCtaPosition?: BannerCtaPosition;
  seoTitle?: string;
  seoDescription?: string;
  banner?: ISaleBanner;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
  showOnHome: boolean;
  showInNav: boolean;
  priority: number;
  homeLimit: number;
  allowCoupons: boolean;
  defaultDiscountType: SaleDiscountType;
  defaultDiscountValue: number;
  items: ISaleItem[];
  stats: ISaleStats;
  createdAt: Date;
  updatedAt: Date;
}

const bannerSchema = new Schema<ISaleBanner>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

const saleItemSchema = new Schema<ISaleItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    discountType: {
      type: String,
      enum: ["percentage", "amount"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0.01, "Discount value must be greater than 0"],
    },
  },
  { _id: false }
);

const statsSchema = new Schema<ISaleStats>(
  {
    views: { type: Number, default: 0, min: 0 },
    addToCarts: { type: Number, default: 0, min: 0 },
    orders: { type: Number, default: 0, min: 0 },
    unitsSold: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const saleCampaignSchema = new Schema<ISaleCampaignDocument>(
  {
    title: {
      type: String,
      required: [true, "Sale title is required"],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-friendly"],
    },
    subtitle: { type: String, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    badgeLabel: {
      type: String,
      trim: true,
      maxlength: 24,
      default: "SALE",
    },
    homeHeadline: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "Flash Cut",
    },
    bannerCtaLabel: {
      type: String,
      trim: true,
      maxlength: 40,
      default: "Shop The Sale",
    },
    bannerCtaHref: { type: String, trim: true, maxlength: 300 },
    bannerCtaPosition: {
      type: String,
      enum: [...BANNER_CTA_POSITIONS],
      default: "bottom-left",
    },
    seoTitle: { type: String, trim: true, maxlength: 80 },
    seoDescription: { type: String, trim: true, maxlength: 200 },
    banner: { type: bannerSchema, default: undefined },
    startsAt: { type: Date, required: [true, "Start date is required"] },
    endsAt: { type: Date, required: [true, "End date is required"] },
    isActive: { type: Boolean, default: true },
    showOnHome: { type: Boolean, default: true },
    showInNav: { type: Boolean, default: true },
    priority: { type: Number, default: 0, min: 0, max: 1000 },
    homeLimit: { type: Number, default: 5, min: 1, max: 12 },
    allowCoupons: { type: Boolean, default: true },
    defaultDiscountType: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    defaultDiscountValue: { type: Number, default: 20, min: 0.01 },
    items: {
      type: [saleItemSchema],
      default: [],
      validate: {
        validator: (val: ISaleItem[]) => val.length >= 1 && val.length <= 80,
        message: "A sale must include between 1 and 80 products",
      },
    },
    stats: { type: statsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  }
);

saleCampaignSchema.pre("validate", function (next) {
  if (this.endsAt && this.startsAt && this.endsAt.getTime() <= this.startsAt.getTime()) {
    this.invalidate("endsAt", "End date must be after the start date");
  }
  if (this.defaultDiscountType === "percentage" && this.defaultDiscountValue > 90) {
    this.invalidate("defaultDiscountValue", "Percentage discount cannot exceed 90%");
  }
  for (const item of this.items || []) {
    if (item.discountType === "percentage" && item.value > 90) {
      this.invalidate("items", "Percentage discount cannot exceed 90%");
      break;
    }
  }
  next();
});

saleCampaignSchema.index({ isActive: 1, startsAt: 1, endsAt: 1, priority: -1 });
saleCampaignSchema.index({ showOnHome: 1, isActive: 1, priority: -1 });

// Dev hot reloads keep the previously compiled model, so schema additions would be
// stripped from writes until a full server restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.SaleCampaign) {
  mongoose.deleteModel("SaleCampaign");
}

const SaleCampaign: Model<ISaleCampaignDocument> =
  mongoose.models.SaleCampaign ??
  mongoose.model<ISaleCampaignDocument>("SaleCampaign", saleCampaignSchema);

export default SaleCampaign;
