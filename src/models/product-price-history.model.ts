import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PriceHistorySource = "initial" | "update";

export interface IProductPriceHistoryDocument extends Document {
  product: Types.ObjectId;
  variant: Types.ObjectId;
  variantLabel: string;
  sku: string;
  price: number;
  gst: number;
  compareAtPrice?: number;
  effectiveAt: Date;
  source: PriceHistorySource;
  changedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productPriceHistorySchema = new Schema<IProductPriceHistoryDocument>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variant: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    variantLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    gst: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 18,
    },
    compareAtPrice: {
      type: Number,
      min: 0,
    },
    effectiveAt: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["initial", "update"],
      required: true,
    },
    changedBy: {
      type: String,
      trim: true,
      maxlength: 200,
    },
  },
  { timestamps: true }
);

productPriceHistorySchema.index({ product: 1, effectiveAt: 1 });
productPriceHistorySchema.index({ product: 1, variant: 1, effectiveAt: -1 });

const ProductPriceHistory: Model<IProductPriceHistoryDocument> =
  mongoose.models.ProductPriceHistory ??
  mongoose.model<IProductPriceHistoryDocument>(
    "ProductPriceHistory",
    productPriceHistorySchema
  );

export default ProductPriceHistory;
