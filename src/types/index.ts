import { Types } from "mongoose";

// ─── User Roles ─────────────────────────────────────────────────────────────
export const USER_ROLES = ["super_admin", "staff", "customer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ─── User Document Interface ────────────────────────────────────────────────
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  isPhoneVerified: boolean;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── JWT Payload ────────────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// ─── API Response Envelope ──────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// ─── Auth Request Bodies ────────────────────────────────────────────────────
export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface SendOtpBody {
  phone: string;
}

export interface VerifyOtpBody {
  phone: string;
  otp: string;
  name?: string;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface CategoryImage {
  url: string;
  publicId: string;
}

export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: CategoryImage;
  parent: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryBody {
  name: string;
  slug: string;
  description?: string;
  image?: CategoryImage;
  parent?: string;
  isActive?: boolean;
}

export interface UpdateCategoryBody extends Partial<CreateCategoryBody> {}

// ─── Product Colors & Sizes ──────────────────────────────────────────────

export const PRODUCT_COLORS = [
  "Black",
  "White",
  "Red",
  "Blue",
  "Green",
  "Yellow",
  "Orange",
  "Purple",
  "Pink",
  "Brown",
  "Grey",
  "Navy",
  "Beige",
  "Maroon",
  "Teal",
  "Coral",
  "Olive",
  "Lavender",
  "Cream",
  "Gold",
  "Silver",
  "Multi",
] as const;

export type ProductColor = (typeof PRODUCT_COLORS)[number];

export const PRODUCT_SIZES = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
  "42",
  "44",
  "Free Size",
] as const;

export type ProductSize = (typeof PRODUCT_SIZES)[number];

// ─── Product Image ──────────────────────────────────────────────────────────

export interface ProductImage {
  url: string;
  publicId: string;
  alt?: string;
}

// ─── Product Variant ────────────────────────────────────────────────────────

export interface ProductVariant {
  _id?: Types.ObjectId;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isActive?: boolean;
}

// ─── Product ────────────────────────────────────────────────────────────────

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  category: Types.ObjectId;
  images: ProductImage[];
  variants: ProductVariant[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  priceRange?: { min: number; max: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductBody {
  title: string;
  slug: string;
  description: string;
  category: string;
  images?: ProductImage[];
  variants: ProductVariant[];
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

export interface UpdateProductBody extends Partial<CreateProductBody> {}

// ─── Inventory ──────────────────────────────────────────────────────────────

export interface StockUpdateItem {
  productId: string;
  variantId: string;
  quantity: number; // positive to add, negative to deduct
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItemBody {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface UpdateCartItemBody {
  quantity: number;
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export interface WishlistItemBody {
  productId: string;
  variantId?: string;
}

// ─── Coupon ──────────────────────────────────────────────────────────────────

export type CouponType = "percentage" | "flat";

export interface ICoupon {
  _id: Types.ObjectId;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  expiresAt: Date;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCouponBody {
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrderValue?: number;
  maxDiscount?: number | null;
  expiresAt: string; // ISO date string
  usageLimit: number;
  perUserLimit?: number;
  isActive?: boolean;
}

export interface UpdateCouponBody extends Partial<CreateCouponBody> {}

export interface ApplyCouponBody {
  code: string;
}

// ─── Pricing & Checkout ──────────────────────────────────────────────────────

export interface GSTBreakdown {
  /** Subtotal before tax */
  subtotal: number;
  /** GST rate applied (e.g. 0.18 for 18%) */
  gstRate: number;
  /** GST percentage label (e.g. "18%") */
  gstLabel: string;
  /** CGST amount (Central GST — intra-state) */
  cgst: number;
  /** SGST amount (State GST — intra-state) */
  sgst: number;
  /** IGST amount (Integrated GST — inter-state, = cgst + sgst) */
  igst: number;
  /** Whether the transaction is inter-state */
  isInterState: boolean;
  /** Total tax amount */
  totalTax: number;
}

export interface ShippingBreakdown {
  method: string;
  cost: number;
  estimatedDays: number;
  isFreeShipping: boolean;
}

export interface CartSummary {
  /** Raw total of (price × qty) for all items */
  subtotal: number;
  /** Discount from coupon, if any */
  discount: number;
  /** Subtotal after discount */
  subtotalAfterDiscount: number;
  /** GST breakdown */
  gst: GSTBreakdown;
  /** Shipping breakdown */
  shipping: ShippingBreakdown;
  /** Grand total = subtotalAfterDiscount + gst.totalTax + shipping.cost */
  grandTotal: number;
  /** Number of items in cart */
  itemCount: number;
}

export interface CartValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: CartSummary | null;
}

// ─── Order ───────────────────────────────────────────────────────────────────

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

export interface CheckoutBody {
  /** Idempotency key to prevent duplicate orders from same checkout */
  idempotencyKey: string;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country?: string;
  };
  /** Optional shipping context */
  isInterState?: boolean;
  notes?: string;
}

export interface VerifyPaymentBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface UpdateOrderStatusBody {
  status: OrderStatus;
  note?: string;
  cancelReason?: string;
}
