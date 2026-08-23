import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CouponType = "percentage" | "flat";

/** Values admins can set directly */
export type CouponStatus = "draft" | "active" | "paused" | "disabled";

/** Includes derived states computed from dates / usage */
export type CouponLifecycleStatus =
  | CouponStatus
  | "scheduled"
  | "expired"
  | "exhausted";

export const COUPON_STATUSES: CouponStatus[] = [
  "draft",
  "active",
  "paused",
  "disabled",
];

export const COUPON_LIFECYCLE_STATUSES: CouponLifecycleStatus[] = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "expired",
  "exhausted",
  "disabled",
];

// ─── Document Interface ──────────────────────────────────────────────────────

export interface ICouponDocument extends Document {
  _id: Types.ObjectId;
  /** Unique redemption code — stored uppercase for case-insensitive matching */
  code: string;
  /** Admin / internal title */
  name: string;
  /** Internal notes (not shown to customers) */
  description?: string;
  /** Short copy shown at cart / checkout */
  customerDescription?: string;
  type: CouponType;
  /** For "percentage" → 0–100; for "flat" → amount in INR */
  value: number;
  /** Minimum eligible subtotal required to apply */
  minOrderValue: number;
  /** Caps percentage discounts; ignored for flat when null */
  maxDiscount: number | null;
  /** When the coupon becomes redeemable */
  startsAt: Date;
  /** Absolute expiry */
  expiresAt: Date;
  /** IANA timezone for admin display (dates stored as UTC) */
  timezone: string;
  /**
   * Admin-controlled lifecycle. Effective state may be scheduled/expired/exhausted.
   */
  status: CouponStatus;
  /**
   * @deprecated Prefer `status`. Kept in sync for older readers.
   */
  isActive: boolean;
  /** 0 = unlimited global redemptions */
  usageLimit: number;
  usedCount: number;
  /** 0 = unlimited per customer */
  perUserLimit: number;
  /** Legacy per-user counters — redemption collection is source of truth going forward */
  usedBy: { user: Types.ObjectId; count: number }[];
  /**
   * Product include list. Empty + empty categories = storewide.
   */
  applicableProducts: Types.ObjectId[];
  /**
   * Category include list. Product matches if its category is listed.
   */
  applicableCategories: Types.ObjectId[];
  /** Always excluded even when storewide or otherwise matched */
  excludedProducts: Types.ObjectId[];
  /** Restrict to customers with no prior paid/delivered orders */
  firstOrderOnly: boolean;
  /** When an order is cancelled, restore usage (default true) */
  restoreOnCancel: boolean;
  deletedAt: Date | null;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
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
    name: {
      type: String,
      trim: true,
      maxlength: [120, "Name must be at most 120 characters"],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
    },
    customerDescription: {
      type: String,
      trim: true,
      maxlength: [280, "Customer description must be at most 280 characters"],
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
    startsAt: {
      type: Date,
      default: () => new Date(),
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
      maxlength: [64, "Timezone must be at most 64 characters"],
    },
    status: {
      type: String,
      enum: {
        values: COUPON_STATUSES,
        message: "Invalid coupon status",
      },
      default: "active",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageLimit: {
      type: Number,
      required: [true, "Usage limit is required"],
      min: [0, "Usage limit cannot be negative"],
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
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    excludedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    firstOrderOnly: {
      type: Boolean,
      default: false,
    },
    restoreOnCancel: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
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

couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ status: 1, startsAt: 1, expiresAt: 1 });
couponSchema.index({ isActive: 1, expiresAt: 1 });
couponSchema.index({ "usedBy.user": 1 });
couponSchema.index({ deletedAt: 1 });

// ─── Hooks ───────────────────────────────────────────────────────────────────

couponSchema.pre("validate", function (next) {
  if (this.type === "percentage" && this.value > 100) {
    this.invalidate("value", "Percentage discount cannot exceed 100%");
  }
  if (this.startsAt && this.expiresAt && this.startsAt >= this.expiresAt) {
    this.invalidate("expiresAt", "Expiry must be after the start date");
  }
  // Keep legacy isActive in sync with control status
  this.isActive = this.status === "active";
  if (!this.name) {
    this.name = this.code;
  }
  next();
});

// ─── Model ───────────────────────────────────────────────────────────────────

const Coupon: Model<ICouponDocument> =
  mongoose.models.Coupon ??
  mongoose.model<ICouponDocument>("Coupon", couponSchema);

export default Coupon;
