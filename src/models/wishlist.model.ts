import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Sub-document Interface ──────────────────────────────────────────────────

export interface IWishlistItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  addedAt: Date;
}

// ─── Document Interface ──────────────────────────────────────────────────────

export interface IWishlistDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: IWishlistItem[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Wishlist Item Sub-schema ────────────────────────────────────────────────

const wishlistItemSchema = new Schema<IWishlistItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    variant: {
      type: Schema.Types.ObjectId,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─── Wishlist Schema ─────────────────────────────────────────────────────────

const wishlistSchema = new Schema<IWishlistDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true, // One wishlist per user
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
      validate: {
        validator: (val: IWishlistItem[]) => val.length <= 200,
        message: "Wishlist cannot have more than 200 items",
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

// ─── Indexes ─────────────────────────────────────────────────────────────────

wishlistSchema.index({ user: 1 }, { unique: true });
wishlistSchema.index({ "items.product": 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

const Wishlist: Model<IWishlistDocument> =
  mongoose.models.Wishlist ??
  mongoose.model<IWishlistDocument>("Wishlist", wishlistSchema);

export default Wishlist;
