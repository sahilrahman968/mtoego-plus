import mongoose, { Schema, Document, Model, Types } from "mongoose";

// ─── Order Status Lifecycle ──────────────────────────────────────────────────
//
//   pending ──► paid ──► processing ──► shipped ──► delivered
//      │          │          │             │
//      └──────────┴──────────┴─────────────┴──► cancelled
//                 │          │             │         │
//                 └──────────┴─────────────┴─────────┴──► refunded
//
// • "pending"    — Razorpay order created, awaiting payment
// • "paid"       — Payment verified, inventory deducted
// • "processing" — Seller is preparing the order
// • "shipped"    — Handed to logistics partner
// • "delivered"  — Successfully delivered
// • "cancelled"  — Order cancelled (before or after payment)
// • "refunded"   — Payment refunded to customer

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Valid status transitions — prevents illegal state changes
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "cancelled", "refunded"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

// ─── Sub-document Interfaces ─────────────────────────────────────────────────

export interface IOrderItem {
  product: Types.ObjectId;
  variant: Types.ObjectId;
  title: string;
  variantLabel: string; // e.g. "Red / XL"
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

export interface IOrderAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IPaymentDetail {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  method?: string; // upi, card, netbanking, wallet, etc.
  bank?: string;
  wallet?: string;
  vpa?: string;
  amountPaid: number; // in paise (as received from Razorpay)
  currency: string;
  paidAt?: Date;
  /** Tracks all webhook events received to prevent duplicate processing */
  webhookEvents: string[];
}

export interface IOrderPricing {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  shippingCost: number;
  grandTotal: number;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  timestamp: Date;
  note?: string;
}

// ─── Document Interface ──────────────────────────────────────────────────────

export interface IOrderDocument extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IOrderAddress;
  pricing: IOrderPricing;
  payment: IPaymentDetail;
  coupon?: {
    code: string;
    type: "percentage" | "flat";
    value: number;
    discountAmount: number;
  };
  status: OrderStatus;
  statusHistory: IStatusHistoryEntry[];
  /** Idempotency key to prevent duplicate order creation from same checkout */
  idempotencyKey?: string;
  /** Whether inventory has been deducted for this order */
  inventoryDeducted: boolean;
  notes?: string;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },
    variant: {
      type: Schema.Types.ObjectId,
      required: [true, "Variant reference is required"],
    },
    title: {
      type: String,
      required: [true, "Product title is required"],
    },
    variantLabel: {
      type: String,
      default: "",
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total cannot be negative"],
    },
  },
  { _id: false }
);

const orderAddressSchema = new Schema<IOrderAddress>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: "IN", trim: true },
  },
  { _id: false }
);

const paymentDetailSchema = new Schema<IPaymentDetail>(
  {
    razorpayOrderId: {
      type: String,
      required: [true, "Razorpay order ID is required"],
    },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    method: { type: String },
    bank: { type: String },
    wallet: { type: String },
    vpa: { type: String },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "INR",
    },
    paidAt: { type: Date },
    webhookEvents: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const orderPricingSchema = new Schema<IOrderPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    subtotalAfterDiscount: { type: Number, required: true, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: ORDER_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: { type: String },
  },
  { _id: false }
);

// ─── Order Schema ────────────────────────────────────────────────────────────

const orderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: [true, "Order number is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    items: {
      type: [orderItemSchema],
      required: [true, "Order must have at least one item"],
      validate: {
        validator: (val: IOrderItem[]) => val.length >= 1,
        message: "Order must have at least one item",
      },
    },
    shippingAddress: {
      type: orderAddressSchema,
      required: [true, "Shipping address is required"],
    },
    pricing: {
      type: orderPricingSchema,
      required: [true, "Pricing is required"],
    },
    payment: {
      type: paymentDetailSchema,
      required: [true, "Payment details are required"],
    },
    coupon: {
      code: { type: String },
      type: { type: String, enum: ["percentage", "flat"] },
      value: { type: Number },
      discountAmount: { type: Number },
    },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: "Invalid order status",
      },
      default: "pending",
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    idempotencyKey: {
      type: String,
    },
    inventoryDeducted: {
      type: Boolean,
      default: false,
    },
    notes: { type: String, maxlength: 1000 },
    cancelReason: { type: String, maxlength: 500 },
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

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "payment.razorpayOrderId": 1 }, { unique: true });
orderSchema.index({ "payment.razorpayPaymentId": 1 }, { sparse: true });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ createdAt: -1 });

// ─── Static: Generate Order Number ───────────────────────────────────────────
// Format: ORD-YYYYMMDD-XXXXX (e.g. ORD-20260214-A3F8K)

// ─── Model ───────────────────────────────────────────────────────────────────

const Order: Model<IOrderDocument> =
  mongoose.models.Order ??
  mongoose.model<IOrderDocument>("Order", orderSchema);

export default Order;

// ─── Generate Order Number (standalone helper) ───────────────────────────────
// Format: ORD-YYYYMMDD-XXXXX (e.g. ORD-20260214-A3F8K)

export async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0");

  // Generate random alphanumeric suffix
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars: I, O, 0, 1
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  const orderNumber = `ORD-${dateStr}-${suffix}`;

  // Check for collision (extremely unlikely)
  const exists = await Order.findOne({ orderNumber });
  if (exists) {
    return generateOrderNumber(); // Retry
  }

  return orderNumber;
}
