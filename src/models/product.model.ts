import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { PRODUCT_COLORS, PRODUCT_SIZES } from "@/types";

// ─── Sub-document Interfaces ────────────────────────────────────────────────

export interface IProductImage {
  url: string;
  publicId: string;
  alt?: string;
}

export interface IProductVariant {
  _id: Types.ObjectId;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isActive: boolean;
}

// ─── Document Interface ─────────────────────────────────────────────────────

export interface IProductDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  images: IProductImage[];
  variants: IProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ────────────────────────────────────────────────────────────

const productImageSchema = new Schema<IProductImage>(
  {
    url: {
      type: String,
      required: [true, "Image URL is required"],
    },
    publicId: {
      type: String,
      required: [true, "Image public ID is required"],
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [200, "Alt text must be at most 200 characters"],
    },
  },
  { _id: false }
);

const productVariantSchema = new Schema<IProductVariant>(
  {
    size: {
      type: String,
      trim: true,
      enum: {
        values: [...PRODUCT_SIZES, ""],
        message: "Size must be one of the predefined values",
      },
    },
    color: {
      type: String,
      trim: true,
      enum: {
        values: [...PRODUCT_COLORS, ""],
        message: "Color must be one of the predefined values",
      },
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]+$/, "SKU must contain only uppercase letters, digits, and hyphens"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      min: [0, "Compare-at price cannot be negative"],
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// ─── Product Schema ─────────────────────────────────────────────────────────

const productSchema = new Schema<IProductDocument>(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [200, "Title must be at most 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-friendly"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description must be at most 5000 characters"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: {
      type: [productImageSchema],
      default: [],
      validate: {
        validator: (val: IProductImage[]) => val.length <= 10,
        message: "A product can have at most 10 images",
      },
    },
    variants: {
      type: [productVariantSchema],
      required: [true, "At least one variant is required"],
      validate: {
        validator: (val: IProductVariant[]) => val.length >= 1 && val.length <= 50,
        message: "A product must have between 1 and 50 variants",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (val: string[]) => val.length <= 20,
        message: "A product can have at most 20 tags",
      },
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

// ─── Indexes ────────────────────────────────────────────────────────────────
// slug unique index is created by `unique: true` on the field
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });
productSchema.index({ tags: 1 });
productSchema.index({ title: "text", description: "text", tags: "text" });

// ─── Virtual: computed price range ──────────────────────────────────────────

productSchema.virtual("priceRange").get(function () {
  if (!this.variants || this.variants.length === 0) return null;
  const prices = this.variants.filter((v) => v.isActive).map((v) => v.price);
  if (prices.length === 0) return null;
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

// ─── Model ──────────────────────────────────────────────────────────────────

const Product: Model<IProductDocument> =
  mongoose.models.Product ??
  mongoose.model<IProductDocument>("Product", productSchema);

export default Product;
