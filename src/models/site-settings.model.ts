import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Sub-document Interfaces ────────────────────────────────────────────────

export interface IHeroBanner {
  type: "image" | "video";
  url: string;
  publicId: string;
  alt?: string;
  link?: string;
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaLink?: string;
  isActive: boolean;
}

export interface IHeroImage {
  url: string;
  publicId: string;
  alt?: string;
  isActive: boolean;
}

// ─── Document Interface ─────────────────────────────────────────────────────

export interface ISiteSettingsDocument extends Document {
  heroBanner: IHeroBanner;
  heroImage: IHeroImage;
  updatedAt: Date;
}

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const heroBannerSchema = new Schema<IHeroBanner>(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    url: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text must be at most 200 characters"],
      default: "",
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    headline: {
      type: String,
      trim: true,
      maxlength: [200, "Headline must be at most 200 characters"],
      default: "",
    },
    subheadline: {
      type: String,
      trim: true,
      maxlength: [500, "Subheadline must be at most 500 characters"],
      default: "",
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: [50, "CTA text must be at most 50 characters"],
      default: "",
    },
    ctaLink: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const heroImageSchema = new Schema<IHeroImage>(
  {
    url: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text must be at most 200 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ─── Main Schema (singleton) ────────────────────────────────────────────────

const siteSettingsSchema = new Schema<ISiteSettingsDocument>(
  {
    heroBanner: {
      type: heroBannerSchema,
      default: () => ({}),
    },
    heroImage: {
      type: heroImageSchema,
      default: () => ({}),
    },
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

// ─── Model ──────────────────────────────────────────────────────────────────

const SiteSettings: Model<ISiteSettingsDocument> =
  mongoose.models.SiteSettings ??
  mongoose.model<ISiteSettingsDocument>("SiteSettings", siteSettingsSchema);

export default SiteSettings;

/**
 * Get the singleton site settings document.
 * Creates one with defaults if it doesn't exist yet.
 * Also migrates existing documents by adding any missing sub-documents.
 */
export async function getSiteSettings(): Promise<ISiteSettingsDocument> {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({});
  }

  // Migrate: ensure heroImage sub-document exists on older documents
  let needsSave = false;
  if (!settings.heroImage) {
    settings.set("heroImage", { url: "", publicId: "", alt: "", isActive: false });
    needsSave = true;
  }
  if (needsSave) {
    await settings.save();
  }

  return settings;
}
