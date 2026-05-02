"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Minus,
  Plus,
  Star,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Check,
} from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import {
  fetchProduct,
  fetchProducts,
  fetchProductReviews,
  submitProductReview,
  updateProductReview,
  deleteProductReview,
  addToWishlist,
  type ProductData,
  type ProductReviewData,
  type ProductReviewsData,
  type ProductVariantData,
} from "@/lib/store-api";
import {
  formatPrice,
  getProductImage,
  getDiscountPercent,
  getVariantLabel,
} from "@/lib/utils";

export default function ProductDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ProductData[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");
  const [reviews, setReviews] = useState<ProductReviewData[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewsData["stats"] | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsHasNextPage, setReviewsHasNextPage] = useState(false);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useEffect(() => {
    fetchProduct(slug).then((res) => {
      if (res.success && res.data) {
        const p = res.data;
        setProduct(p);
        const activeVariants = p.variants.filter((v) => v.isActive !== false);
        if (activeVariants.length > 0) {
          setSelectedVariant(activeVariants[0]);
        }
        // Fetch related products
        if (p.category?._id) {
          fetchProducts({ category: p.category._id, limit: 4 }).then((relRes) => {
            if (relRes.success && relRes.data) {
              setRelatedProducts(
                relRes.data.items.filter((rp) => rp._id !== p._id).slice(0, 4)
              );
            }
          });
        }
      }
      setLoading(false);
    });
  }, [slug]);

  const loadReviews = useCallback(async (page: number, append = false) => {
    setReviewsLoading(true);
    const res = await fetchProductReviews(slug, { page, limit: 5 });
    if (res.success && res.data) {
      setReviews((prev) => (append ? [...prev, ...res.data.items] : res.data.items));
      setReviewStats(res.data.stats);
      setReviewsHasNextPage(res.data.hasNextPage);
      setReviewsTotalPages(res.data.totalPages);
      setReviewsPage(res.data.page);
    } else {
      setReviews([]);
      setReviewStats(null);
      setReviewsHasNextPage(false);
      setReviewsTotalPages(1);
    }
    setReviewsLoading(false);
  }, [slug]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReviews(1);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReviews]);

  const activeVariants = useMemo(
    () => product?.variants.filter((v) => v.isActive !== false) || [],
    [product]
  );

  const uniqueSizes = useMemo(
    () => [...new Set(activeVariants.map((v) => v.size).filter(Boolean))],
    [activeVariants]
  );

  const uniqueColors = useMemo(
    () => [...new Set(activeVariants.map((v) => v.color).filter(Boolean))],
    [activeVariants]
  );

  const discount = selectedVariant
    ? getDiscountPercent(selectedVariant.price, selectedVariant.compareAtPrice)
    : 0;

  const averageRating = reviewStats?.averageRating ?? 0;
  const totalReviews = reviewStats?.totalReviews ?? 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (!selectedVariant) return;

    setAddingToCart(true);
    const res = await addToCart(product!._id, selectedVariant._id, quantity);
    if (res.success) {
      toast("Added to cart!", "success");
    } else {
      toast(res.message, "error");
    }
    setAddingToCart(false);
  };

  const handleAddToWishlist = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    const res = await addToWishlist(product!._id, selectedVariant?._id);
    if (res.success) {
      toast("Added to wishlist!", "success");
    } else {
      toast(res.message || "Already in wishlist", "info");
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (!selectedVariant) return;

    setAddingToCart(true);
    const res = await addToCart(product!._id, selectedVariant._id, quantity);
    if (res.success) {
      router.push("/checkout");
      return;
    }
    toast(res.message, "error");
    setAddingToCart(false);
  };

  const handleSubmitReview = async () => {
    if (!product) return;
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (reviewComment.trim().length < 3) {
      toast("Please add at least 3 characters in your review", "error");
      return;
    }

    setSubmittingReview(true);
    const res = editingReviewId
      ? await updateProductReview(editingReviewId, {
          rating: reviewRating,
          comment: reviewComment.trim(),
        })
      : await submitProductReview({
          productId: product._id,
          rating: reviewRating,
          comment: reviewComment.trim(),
        });

    if (res.success) {
      toast(editingReviewId ? "Review updated successfully" : "Review submitted successfully", "success");
      setReviewComment("");
      setReviewRating(5);
      setEditingReviewId(null);
      await loadReviews(1);
    } else {
      toast(res.message || "Failed to submit review", "error");
    }
    setSubmittingReview(false);
  };

  const handleEditReview = (review: ProductReviewData) => {
    setEditingReviewId(review._id);
    setReviewRating(review.rating);
    setReviewComment(review.comment);
  };

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = window.confirm("Delete your review?");
    if (!confirmed) return;
    setSubmittingReview(true);
    const res = await deleteProductReview(reviewId);
    if (res.success) {
      toast("Review deleted", "success");
      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
        setReviewRating(5);
        setReviewComment("");
      }
      await loadReviews(1);
    } else {
      toast(res.message || "Failed to delete review", "error");
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-8 sm:px-4 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse-slow bg-card-hover" />
          <div className="space-y-4">
            <div className="h-4 w-1/4 animate-pulse-slow bg-card-hover" />
            <div className="h-12 w-3/4 animate-pulse-slow bg-card-hover" />
            <div className="h-10 w-1/3 animate-pulse-slow bg-card-hover" />
            <div className="h-24 animate-pulse-slow bg-card-hover" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <h1 className="text-2xl font-bold text-foreground">Product Not Found</h1>
        <p className="text-muted mt-2">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3 text-white transition-colors hover:bg-primary-dark"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <nav className="mb-5 flex items-center gap-2 overflow-x-auto text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        <Link href="/" className="shrink-0 hover:text-foreground">
          Home
        </Link>
        <ChevronRight size={12} />
        <Link href="/products" className="shrink-0 hover:text-foreground">
          Jackets
        </Link>
        {product.category && (
          <>
            <ChevronRight size={12} />
            <Link
              href={`/categories/${product.category.slug}`}
              className="shrink-0 hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="truncate text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <section className="space-y-0">
          <div className="relative aspect-[1/1.02] overflow-hidden border border-border bg-card">
            <Image
              src={getProductImage(product.images, selectedImage)}
              alt={product.images?.[selectedImage]?.alt || product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 54vw"
              className="object-cover"
              priority
            />
            {discount > 0 && (
              <div className="absolute left-4 top-4 border border-primary/40 bg-primary/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                -{discount}%
              </div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 border-x border-b border-border bg-black/30 p-2">
              {product.images.slice(0, 5).map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative aspect-square overflow-hidden border transition-colors ${
                    selectedImage === idx
                      ? "border-primary"
                      : "border-border hover:border-accent"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.title} ${idx + 1}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="border border-border bg-card/30 p-5 sm:p-6">
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/90 hover:text-primary"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="mt-2 text-3xl font-bold uppercase leading-[0.88] text-foreground sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-3 flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={14}
                  className={s <= Math.round(averageRating) ? "fill-primary text-primary" : "text-muted/35"}
                />
              ))}
            </div>
            <span>
              {totalReviews > 0 ? `${averageRating.toFixed(1)} / ${totalReviews} Reviews` : "No Reviews Yet"}
            </span>
          </div>

          {selectedVariant && (
            <div className="mt-5 flex items-end gap-3">
              <span className="text-5xl font-bold leading-none text-foreground">
                {formatPrice(selectedVariant.price)}
              </span>
              {selectedVariant.compareAtPrice &&
                selectedVariant.compareAtPrice > selectedVariant.price && (
                  <span className="pb-1 text-lg text-muted line-through">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                )}
            </div>
          )}

          <p className="mt-4 text-base text-muted">
            {product.description || "All-black version. Same armor. No compromise."}
          </p>

          {uniqueColors.length > 0 && (
            <div className="mt-7">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                <span>Colorway</span>
                <span className="text-foreground">{selectedVariant?.color || "-"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((color) => {
                  const matchingVariant = activeVariants.find(
                    (v) =>
                      v.color === color &&
                      (!selectedVariant?.size || v.size === selectedVariant.size)
                  );
                  const isSelected = selectedVariant?.color === color;
                  return (
                    <button
                      key={color}
                      onClick={() => matchingVariant && setSelectedVariant(matchingVariant)}
                      disabled={!matchingVariant || matchingVariant.stock === 0}
                      className={`min-w-20 border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : matchingVariant && matchingVariant.stock > 0
                          ? "border-border bg-black/45 text-foreground hover:border-accent"
                          : "cursor-not-allowed border-border text-muted/45 line-through"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {uniqueSizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.28em] text-muted">
                <span>Size</span>
                <span className="text-primary">Size Guide</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uniqueSizes.map((size) => {
                  const matchingVariant = activeVariants.find(
                    (v) =>
                      v.size === size &&
                      (!selectedVariant?.color || v.color === selectedVariant.color)
                  );
                  const isSelected = selectedVariant?.size === size;
                  return (
                    <button
                      key={size}
                      onClick={() => matchingVariant && setSelectedVariant(matchingVariant)}
                      disabled={!matchingVariant || matchingVariant.stock === 0}
                      className={`h-11 border text-sm font-semibold uppercase tracking-[0.08em] transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : matchingVariant && matchingVariant.stock > 0
                          ? "border-border bg-black/45 text-foreground hover:border-accent"
                          : "cursor-not-allowed border-border text-muted/45 line-through"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <div className="inline-flex h-11 items-center border border-border bg-black/35">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center text-foreground/85 hover:text-foreground"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(Math.min(selectedVariant?.stock || 50, quantity + 1))
                }
                className="flex h-11 w-11 items-center justify-center text-foreground/85 hover:text-foreground"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={
                addingToCart ||
                !selectedVariant ||
                selectedVariant.stock === 0
              }
              className="flex-1 border border-border bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.28em] text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {addingToCart ? "Processing..." : selectedVariant?.stock === 0 ? "Out of Stock" : "Add To Bag"}
            </button>

            <button
              onClick={handleAddToWishlist}
              className="flex h-11 w-11 items-center justify-center border border-border bg-black/35 text-foreground transition-colors hover:border-accent"
              aria-label="Add to wishlist"
            >
              <Heart size={16} />
            </button>
          </div>

          <button
            onClick={handleBuyNow}
            disabled={!selectedVariant || selectedVariant.stock === 0 || addingToCart}
            className="mt-3 h-12 w-full bg-primary px-4 text-xs font-semibold uppercase tracking-[0.3em] text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy Now - {selectedVariant ? formatPrice(selectedVariant.price * quantity) : ""}
          </button>

          {selectedVariant && selectedVariant.stock <= 10 && selectedVariant.stock > 0 && (
            <p className="mt-2 text-xs font-medium uppercase tracking-[0.1em] text-warning">
              Only {selectedVariant.stock} left in stock
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 border-y border-border py-4">
            <div className="text-center">
              <Truck size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Free Shipping</p>
            </div>
            <div className="text-center">
              <Shield size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">CE Certified</p>
            </div>
            <div className="text-center">
              <RotateCcw size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">30 Day Returns</p>
            </div>
          </div>

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/products?tag=${tag}`}
                  className="border border-border bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition-colors hover:border-accent hover:text-foreground"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Tabs: Description / Reviews */}
      <div className="mt-12 sm:mt-16">
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-semibold uppercase tracking-[0.14em] border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 text-sm font-semibold uppercase tracking-[0.14em] border-b-2 transition-colors ${
                activeTab === "reviews"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Reviews
            </button>
          </div>
        </div>

        <div className="py-6">
          {activeTab === "description" ? (
            <div className="prose prose-sm max-w-none text-foreground">
              <p className="whitespace-pre-line leading-relaxed">{product.description}</p>

              {/* Variant details table */}
              {activeVariants.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold mb-3">Available Variants</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full overflow-hidden border border-border text-sm">
                      <thead className="bg-card">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Variant</th>
                          <th className="px-4 py-2 text-left font-medium">SKU</th>
                          <th className="px-4 py-2 text-right font-medium">Price</th>
                          <th className="px-4 py-2 text-center font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activeVariants.map((v) => (
                          <tr key={v._id}>
                            <td className="px-4 py-2">{getVariantLabel(v)}</td>
                            <td className="px-4 py-2 text-muted">{v.sku}</td>
                            <td className="px-4 py-2 text-right font-medium">
                              {formatPrice(v.price)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {v.stock > 0 ? (
                                <span className="text-success">
                                  <Check size={14} className="inline" /> In Stock
                                </span>
                              ) : (
                                <span className="text-danger">Out of Stock</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              <section className="border border-border bg-card/50 p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  {editingReviewId ? "Edit Your Review" : "Write a Review"}
                </h3>
                <div className="mt-3 flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="text-primary"
                      aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                    >
                      <Star
                        size={18}
                        className={
                          star <= reviewRating ? "fill-primary text-primary" : "text-muted/40"
                        }
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience with this product"
                  rows={4}
                  className="mt-3 w-full border border-border bg-black/35 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    Only delivered purchases can submit reviews.
                  </p>
                  <div className="flex items-center gap-2">
                    {editingReviewId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReviewId(null);
                          setReviewRating(5);
                          setReviewComment("");
                        }}
                        className="border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingReview
                        ? editingReviewId
                          ? "Updating..."
                          : "Submitting..."
                        : editingReviewId
                        ? "Update Review"
                        : "Submit Review"}
                    </button>
                  </div>
                </div>
              </section>

              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((idx) => (
                    <div key={idx} className="h-24 animate-pulse-slow border border-border bg-card-hover" />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center">
                  <Star size={36} className="mx-auto mb-3 text-muted/35" />
                  <h3 className="text-lg font-semibold text-foreground">No Reviews Yet</h3>
                  <p className="mt-1 text-sm text-muted">Be the first to review this product.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <article key={review._id} className="border border-border bg-card/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{review.user.name}</p>
                            {review.isVerifiedPurchase && (
                              <span className="border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-success">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted">
                            {new Date(review.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              className={
                                star <= review.rating ? "fill-primary text-primary" : "text-muted/35"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-sm text-muted">{review.comment}</p>
                      {user && review.user.id === user.id && (
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReview(review)}
                            className="border border-border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review._id)}
                            className="border border-danger/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-danger transition-colors hover:bg-danger/10"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  {reviewsHasNextPage && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                      onClick={() => loadReviews(reviewsPage + 1, true)}
                        disabled={reviewsLoading || reviewsPage >= reviewsTotalPages}
                        className="border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Load More Reviews
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <h2 className="mb-6 text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl">
            Related Products
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
