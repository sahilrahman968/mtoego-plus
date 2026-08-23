import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CouponRedemptionStatus = "redeemed" | "restored";

export interface ICouponRedemptionDocument extends Document {
  _id: Types.ObjectId;
  coupon: Types.ObjectId;
  code: string;
  user: Types.ObjectId;
  order: Types.ObjectId;
  orderNumber: string;
  discountAmount: number;
  /** Snapshot of coupon config at redemption time */
  snapshot: {
    type: "percentage" | "flat";
    value: number;
    maxDiscount: number | null;
    minOrderValue: number;
  };
  status: CouponRedemptionStatus;
  restoredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const snapshotSchema = new Schema(
  {
    type: { type: String, enum: ["percentage", "flat"], required: true },
    value: { type: Number, required: true },
    maxDiscount: { type: Number, default: null },
    minOrderValue: { type: Number, default: 0 },
  },
  { _id: false }
);

const redemptionSchema = new Schema<ICouponRedemptionDocument>(
  {
    coupon: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    snapshot: {
      type: snapshotSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["redeemed", "restored"],
      default: "redeemed",
    },
    restoredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One active redemption per order (idempotent redeem)
redemptionSchema.index({ order: 1 }, { unique: true });
redemptionSchema.index({ coupon: 1, user: 1, status: 1 });

const CouponRedemption: Model<ICouponRedemptionDocument> =
  mongoose.models.CouponRedemption ??
  mongoose.model<ICouponRedemptionDocument>("CouponRedemption", redemptionSchema);

export default CouponRedemption;
