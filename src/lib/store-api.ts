// Client-side API helpers for the storefront

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok && !json.message) {
    throw new Error(`API error: ${res.status}`);
  }
  return json;
}

// ── Products ─────────────────────────────────────────────────────────────

export interface ProductListParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  category?: string;
  featured?: boolean;
  tag?: string;
  search?: string;
}

export async function fetchProducts(params: ProductListParams = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.category) sp.set("category", params.category);
  if (params.featured) sp.set("featured", "true");
  if (params.tag) sp.set("tag", params.tag);
  if (params.search) sp.set("search", params.search);
  return apiFetch<{
    items: ProductData[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }>(`/api/products?${sp.toString()}`);
}

export async function fetchProduct(slug: string) {
  return apiFetch<ProductData>(`/api/products/${slug}`);
}

export async function fetchProductReviews(
  slug: string,
  params: { page?: number; limit?: number } = {}
) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  const query = sp.toString();
  return apiFetch<ProductReviewsData>(
    `/api/products/${slug}/reviews${query ? `?${query}` : ""}`
  );
}

export async function submitProductReview(payload: {
  productId: string;
  rating: number;
  comment: string;
}) {
  return apiFetch<ProductReviewData>("/api/user/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProductReview(
  reviewId: string,
  payload: { rating: number; comment: string }
) {
  return apiFetch<ProductReviewData>(`/api/user/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProductReview(reviewId: string) {
  return apiFetch<null>(`/api/user/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

export async function getAdminReviews(params: {
  page?: number;
  limit?: number;
  status?: "visible" | "hidden";
  search?: string;
} = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  return apiFetch<AdminReviewsData>(`/api/admin/reviews?${sp.toString()}`);
}

export async function moderateAdminReview(
  reviewId: string,
  payload: { isHidden: boolean; hiddenReason?: string }
) {
  return apiFetch(`/api/admin/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminReview(reviewId: string) {
  return apiFetch<null>(`/api/admin/reviews/${reviewId}`, {
    method: "DELETE",
  });
}

export async function getAdminCallbackRequests(params: {
  page?: number;
  limit?: number;
  status?: "new" | "contacted" | "closed";
  search?: string;
} = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  if (params.search) sp.set("search", params.search);
  return apiFetch<AdminCallbackRequestsData>(`/api/admin/callback-requests?${sp.toString()}`);
}

export async function updateAdminCallbackRequest(
  requestId: string,
  payload: { status: "new" | "contacted" | "closed"; adminNote?: string }
) {
  return apiFetch<AdminCallbackRequestData>(`/api/admin/callback-requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ── Categories ───────────────────────────────────────────────────────────

export async function fetchCategories(parent?: string | null) {
  const sp = new URLSearchParams();
  if (parent === null) sp.set("parent", "null");
  else if (parent) sp.set("parent", parent);
  return apiFetch<CategoryData[]>(`/api/categories?${sp.toString()}`);
}

// ── Cart ─────────────────────────────────────────────────────────────────

export async function getCart() {
  return apiFetch<CartData>("/api/user/cart");
}

export async function addToCart(productId: string, variantId: string, quantity: number) {
  return apiFetch<CartData>("/api/user/cart", {
    method: "POST",
    body: JSON.stringify({ productId, variantId, quantity }),
  });
}

export async function updateCartItem(itemId: string, quantity: number) {
  return apiFetch<CartData>(`/api/user/cart/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string) {
  return apiFetch<CartData>(`/api/user/cart/items/${itemId}`, {
    method: "DELETE",
  });
}

export async function clearCart() {
  return apiFetch("/api/user/cart", { method: "DELETE" });
}

export async function applyCoupon(code: string) {
  return apiFetch("/api/user/cart/apply-coupon", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function removeCoupon() {
  return apiFetch("/api/user/cart/apply-coupon", { method: "DELETE" });
}

// ── Wishlist ─────────────────────────────────────────────────────────────

export async function getWishlist() {
  return apiFetch<WishlistData>("/api/user/wishlist");
}

export async function addToWishlist(productId: string, variantId?: string) {
  return apiFetch<WishlistData>("/api/user/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId, variantId }),
  });
}

export async function removeFromWishlist(itemId: string) {
  return apiFetch<WishlistData>(`/api/user/wishlist/${itemId}`, {
    method: "DELETE",
  });
}

// ── Checkout ─────────────────────────────────────────────────────────────

export interface CheckoutPayload {
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
  isInterState?: boolean;
  notes?: string;
}

export async function initiateCheckout(payload: CheckoutPayload) {
  return apiFetch<CheckoutResponseData>("/api/user/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<PaymentVerifyData>("/api/user/checkout/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Orders ───────────────────────────────────────────────────────────────

export async function getOrders(params: { page?: number; limit?: number; status?: string } = {}) {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.status) sp.set("status", params.status);
  return apiFetch<{
    items: OrderListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }>(`/api/user/orders?${sp.toString()}`);
}

export async function getOrder(orderId: string) {
  return apiFetch<OrderDetail>(`/api/user/orders/${orderId}`);
}

// ── Auth ─────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return apiFetch<{ user: UserData }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(name: string, email: string, password: string) {
  return apiFetch<{ user: UserData }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export async function logout() {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

export async function fetchCurrentUser() {
  return apiFetch<{ user: UserData }>("/api/auth/me");
}

export async function googleAuth(credential: string) {
  return apiFetch<{ user: UserData }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function getGoogleClientId() {
  return apiFetch<{ clientId: string }>("/api/auth/google-client-id");
}

export async function verifyEmail(token: string) {
  return apiFetch<null>(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification(email: string) {
  return apiFetch<null>("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function sendOtp(phone: string) {
  return apiFetch<{ phone: string; isExistingUser: boolean }>(
    "/api/auth/send-otp",
    {
      method: "POST",
      body: JSON.stringify({ phone }),
    }
  );
}

export async function verifyOtp(phone: string, otp: string, name?: string) {
  return apiFetch<
    { user: UserData; needsName?: never } | { needsName: true; phone: string; user?: never }
  >("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp, name }),
  });
}

// ── Shared Types ─────────────────────────────────────────────────────────

export interface UserData {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  picture?: string | null;
  role: string;
}

export interface CategoryData {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: { url: string; publicId: string };
  parent?: { _id: string; name: string; slug: string } | null;
  isActive: boolean;
}

export interface ProductVariantData {
  _id: string;
  size?: string;
  color?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isActive?: boolean;
}

export interface ProductImageData {
  url: string;
  publicId: string;
  alt?: string;
}

export interface ProductData {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: { _id: string; name: string; slug: string };
  images: ProductImageData[];
  variants: ProductVariantData[];
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  priceRange?: { min: number; max: number } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductReviewData {
  _id: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  isHidden?: boolean;
  hiddenReason?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface ProductReviewsData {
  items: ProductReviewData[];
  stats: {
    averageRating: number;
    totalReviews: number;
    ratingBreakdown: Record<number, number>;
  };
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminReviewData {
  _id: string;
  product: { _id: string; title: string; slug: string } | null;
  user: { _id: string; name: string; email?: string } | null;
  rating: number;
  comment: string;
  isHidden: boolean;
  hiddenReason?: string;
  createdAt: string;
}

export interface AdminReviewsData {
  items: AdminReviewData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AdminCallbackRequestData {
  _id: string;
  requirement: string;
  phone: string;
  contactHours: string;
  sourceUrl?: string;
  status: "new" | "contacted" | "closed";
  adminNote?: string;
  contactedAt?: string;
  createdAt: string;
  handledBy?: {
    _id: string;
    name: string;
    email?: string;
  };
}

export interface AdminCallbackRequestsData {
  items: AdminCallbackRequestData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CartItemData {
  _id: string;
  product: {
    _id: string;
    title: string;
    slug: string;
    images: ProductImageData[];
    isActive: boolean;
    variants: ProductVariantData[];
  };
  variant: string;
  quantity: number;
  priceAtAdd: number;
  addedAt: string;
}

export interface CartData {
  _id: string;
  user: string;
  items: CartItemData[];
  coupon?: {
    _id: string;
    code: string;
    type: "percentage" | "flat";
    value: number;
    maxDiscount: number | null;
    minOrderValue: number;
    expiresAt: string;
    isActive: boolean;
  } | null;
}

export interface WishlistItemData {
  _id: string;
  product: {
    _id: string;
    title: string;
    slug: string;
    images: ProductImageData[];
    isActive: boolean;
    variants: ProductVariantData[];
    priceRange?: { min: number; max: number } | null;
  };
  variant?: string;
  addedAt: string;
}

export interface WishlistData {
  _id: string;
  user: string;
  items: WishlistItemData[];
}

export interface CheckoutResponseData {
  orderId: string;
  orderNumber: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  key: string;
  summary: {
    subtotal: number;
    discount: number;
    subtotalAfterDiscount: number;
    gst: { totalTax: number; cgst: number; sgst: number; igst: number; gstLabel: string };
    shipping: { cost: number; method: string; isFreeShipping: boolean };
    grandTotal: number;
    itemCount: number;
  };
}

export interface PaymentVerifyData {
  orderId: string;
  orderNumber: string;
  status: string;
  payment: {
    razorpayPaymentId: string;
    amount: number;
    paidAt: string;
  };
}

export interface OrderListItem {
  _id: string;
  orderNumber: string;
  status: string;
  pricing: { grandTotal: number };
  items: { title: string; quantity: number }[];
  payment?: { paidAt?: string };
  createdAt: string;
}

export interface OrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  items: {
    _id: string;
    product: { slug: string; images: ProductImageData[] } | null;
    title: string;
    variantLabel: string;
    sku: string;
    price: number;
    quantity: number;
    total: number;
  }[];
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  pricing: {
    subtotal: number;
    discount: number;
    subtotalAfterDiscount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    shippingCost: number;
    grandTotal: number;
  };
  payment: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    amountPaid: number;
    currency: string;
    paidAt?: string;
  };
  coupon?: {
    code: string;
    type: string;
    value: number;
    discountAmount: number;
  };
  statusHistory: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}
