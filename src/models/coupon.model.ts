import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CouponType = "percentage" | "flat";

// ─── Document Interface ──────────────────────────────────────────────────────

export interface ICouponDocument extends Document {
  _id: Types.ObjectId;
  code: string;
  description?: string;
  type: CouponType;
  /** For "percentage" → 0–100; for "flat" → amount in INR */
  value: number;
  /** Minimum cart subtotal (before discount) required to apply */
  minOrderValue: number;
  /** Maximum discount amount (caps percentage coupons) */
  maxDiscount: number | null;
  /** Absolute expiry date */
  expiresAt: Date;
  /** Total number of times this coupon can be used across all users */
  usageLimit: number;
  /** How many times this coupon has been used */
  usedCount: number;
  /** Max uses per individual user (0 = unlimited) */
  perUserLimit: number;
  /** Track which users have used this coupon and how many times */
  usedBy: { user: Types.ObjectId; count: number }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const couponSchema = new Schema<ICouponDocument>(
  {
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      uppercase: true,
      trim: true,
      minlength: [3, "Coupon code must be at least 3 characters"],
      maxlength: [30, "Coupon code must be at most 30 characters"],
      match: [/^[A-Z0-9_-]+$/, "Coupon code must contain only letters, digits, hyphens, and underscores"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    type: {
      type: String,
      required: [true, "Coupon type is required"],
      enum: {
        values: ["percentage", "flat"],
        message: 'Type must be "percentage" or "flat"',
      },
    },
    value: {
      type: Number,
      required: [true, "Coupon value is required"],
      min: [0, "Value cannot be negative"],
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, "Minimum order value cannot be negative"],
    },
    maxDiscount: {
      type: Number,
      default: null,
      min: [0, "Maximum discount cannot be negative"],
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    usageLimit: {
      type: Number,
      required: [true, "Usage limit is required"],
      min: [1, "Usage limit must be at least 1"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Used count cannot be negative"],
    },
    perUserLimit: {
      type: Number,
      default: 1,
      min: [0, "Per-user limit cannot be negative"],
    },
    usedBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        count: { type: Number, default: 1, min: 1 },
      },
    ],
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

// ─── Indexes ─────────────────────────────────────────────────────────────────

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, expiresAt: 1 });
couponSchema.index({ "usedBy.user": 1 });

// ─── Custom Validators ───────────────────────────────────────────────────────

couponSchema.pre("validate", function (next) {
  if (this.type === "percentage" && this.value > 100) {
    this.invalidate("value", "Percentage discount cannot exceed 100%");
  }
  next();
});

// ─── Model ───────────────────────────────────────────────────────────────────

const Coupon: Model<ICouponDocument> =
  mongoose.models.Coupon ??
  mongoose.model<ICouponDocument>("Coupon", couponSchema);

export default Coupon;
