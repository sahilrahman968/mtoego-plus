import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Sub-document Interface ──────────────────────────────────────────────────

export interface ICartItem {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  variant: Types.ObjectId;
  quantity: number;
  /** Snapshot of price at time of adding — used for drift detection */
  priceAtAdd: number;
  addedAt: Date;
}

// ─── Document Interface ──────────────────────────────────────────────────────

export interface ICartDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  coupon: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Cart Item Sub-schema ────────────────────────────────────────────────────

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    variant: {
      type: Schema.Types.ObjectId,
      required: [true, "Variant is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      max: [50, "Quantity cannot exceed 50"],
    },
    priceAtAdd: {
      type: Number,
      required: [true, "Price snapshot is required"],
      min: [0, "Price cannot be negative"],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

// ─── Cart Schema ─────────────────────────────────────────────────────────────

const cartSchema = new Schema<ICartDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      unique: true, // One cart per user
    },
    items: {
      type: [cartItemSchema],
      default: [],
      validate: {
        validator: (val: ICartItem[]) => val.length <= 100,
        message: "Cart cannot have more than 100 items",
      },
    },
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
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

cartSchema.index({ user: 1 }, { unique: true });
cartSchema.index({ "items.product": 1, "items.variant": 1 });

// ─── Model ───────────────────────────────────────────────────────────────────

const Cart: Model<ICartDocument> =
  mongoose.models.Cart ??
  mongoose.model<ICartDocument>("Cart", cartSchema);

export default Cart;
