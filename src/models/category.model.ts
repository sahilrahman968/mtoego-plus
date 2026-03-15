import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Document Interface ─────────────────────────────────────────────────────
export interface ICategoryImage {
  url: string;
  publicId: string;
}

export interface ICategoryDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: ICategoryImage;
  parent: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Category Schema ────────────────────────────────────────────────────────

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
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
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ name: "text" });

// ─── Model ──────────────────────────────────────────────────────────────────
const Category: Model<ICategoryDocument> =
  mongoose.models.Category ??
  mongoose.model<ICategoryDocument>("Category", categorySchema);

export default Category;
