"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
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
} from "@/lib/utils";
import { priceInclGst } from "@/lib/pricing";
import { trackRecentlyViewed } from "@/lib/recently-viewed";
import { ProductDetailSkeleton, ReviewCardSkeleton } from "@/components/store/skeletons";

/** Index of the first image tagged with the given color, or 0 when none match. */
function imageIndexForColor(
  images: ProductData["images"],
  color?: string
): number {
  if (!color) return 0;
  const index = images.findIndex((image) => image.color === color);
  return index === -1 ? 0 : index;
}

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
        trackRecentlyViewed(p);
        const activeVariants = p.variants.filter((v) => v.isActive !== false);
        if (activeVariants.length > 0) {
          const initialVariant =
            activeVariants.find((variant) => variant.stock > 0) ?? activeVariants[0];
          setSelectedVariant(initialVariant);
          setSelectedImage(imageIndexForColor(p.images, initialVariant.color));
        }
        // Prefer curated related products; fall back to same-category suggestions
        const curated = (p.relatedProducts || []).filter(
          (rp) => rp && typeof rp === "object" && "_id" in rp && rp._id !== p._id
        );
        if (curated.length > 0) {
          setRelatedProducts(curated);
        } else if (p.category?._id) {
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
      const reviewData = res.data;
      setReviews((prev) => (append ? [...prev, ...reviewData.items] : reviewData.items));
      setReviewStats(reviewData.stats);
      setReviewsHasNextPage(reviewData.hasNextPage);
      setReviewsTotalPages(reviewData.totalPages);
      setReviewsPage(reviewData.page);
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

  const images = useMemo(() => product?.images ?? [], [product]);

  const discount = selectedVariant
    ? getDiscountPercent(
        priceInclGst(selectedVariant.price, selectedVariant.gst),
        selectedVariant.compareAtPrice
          ? priceInclGst(selectedVariant.compareAtPrice, selectedVariant.gst)
          : undefined
      )
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
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-[92rem] px-3 py-20 text-center sm:px-4 lg:px-6">
        <h1 className="text-2xl text-foreground">Product Not Found</h1>
        <p className="body-copy mx-auto mt-3 text-muted">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/products"
          className="btn-text mt-6 inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[92rem] px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
      <nav className="eyebrow-xs mb-6 flex items-center gap-2 overflow-x-auto text-muted">
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
              key={images[selectedImage]?.url || "product-placeholder"}
              src={getProductImage(images, selectedImage)}
              alt={images[selectedImage]?.alt || product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 54vw"
              className="object-cover"
              priority
            />
            {selectedVariant && selectedVariant.stock > 0 && discount > 0 && (
              <div className="eyebrow-xs tabular absolute left-4 top-4 border border-primary/40 bg-primary/20 px-2 py-1 text-primary">
                -{discount}%
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 border-x border-b border-border bg-black/30 p-2">
              {images.map((img, idx) => (
                <button
                  key={`${img.publicId || img.url}-${idx}`}
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
              className="eyebrow text-primary/90 hover:text-primary"
            >
              {product.category.name}
            </Link>
          )}

          {/* 1.05 keeps multi-line uppercase titles tight without the lines colliding. */}
          <h1 className="mt-3 text-2xl uppercase leading-[1.05] text-foreground sm:text-4xl">
            {product.title}
          </h1>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div className="eyebrow-xs text-muted">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={18}
                    className={s <= Math.round(averageRating) ? "fill-primary text-primary" : "text-muted/35"}
                  />
                ))}
              </div>
              <span className="tabular mt-2 block">
                {totalReviews > 0 ? `${averageRating.toFixed(1)} / ${totalReviews} Reviews` : "No Reviews Yet"}
              </span>
            </div>

            {selectedVariant && (
              <div className="flex items-end gap-2">
                <span
                  className={`eyebrow leading-none ${
                    selectedVariant.stock > 0 ? "text-foreground" : "text-danger"
                  }`}
                >
                  {selectedVariant.stock > 0
                    ? formatPrice(
                        priceInclGst(selectedVariant.price, selectedVariant.gst)
                      )
                    : "Out of stock"}
                </span>
                {selectedVariant.stock > 0 &&
                  selectedVariant.compareAtPrice &&
                  priceInclGst(selectedVariant.compareAtPrice, selectedVariant.gst) >
                    priceInclGst(selectedVariant.price, selectedVariant.gst) && (
                    <span className="eyebrow pb-0.5 text-muted line-through">
                      {formatPrice(
                        priceInclGst(selectedVariant.compareAtPrice, selectedVariant.gst)
                      )}
                    </span>
                  )}
              </div>
            )}
          </div>

          {uniqueColors.length > 0 && (
            <div className="mt-7">
              <div className="label-text mb-2.5 flex items-center justify-between text-muted">
                <span>Colorway</span>
                <span className="text-foreground">{selectedVariant?.color || "-"}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((color) => {
                  const colorVariants = activeVariants.filter(
                    (variant) => variant.color === color && variant.stock > 0
                  );
                  const matchingVariant =
                    colorVariants.find(
                      (variant) =>
                        !selectedVariant?.size ||
                        variant.size === selectedVariant.size
                    ) ?? colorVariants[0];
                  const isSelected = selectedVariant?.color === color;
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        if (!matchingVariant) return;
                        setSelectedImage(imageIndexForColor(images, color));
                        setSelectedVariant(matchingVariant);
                      }}
                      disabled={!matchingVariant}
                      className={`btn-text min-w-20 border px-4 py-2.5 transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : matchingVariant
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
              <div className="label-text mb-2.5 text-muted">
                <span>Size</span>
              </div>
              <div className="flex gap-2 overflow-x-auto">
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
                      className={`btn-text shrink-0 whitespace-nowrap border px-4 py-2.5 transition-colors ${
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
              <span className="tabular w-10 text-center text-sm font-semibold">{quantity}</span>
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
              className="flex h-11 w-11 items-center justify-center border border-border bg-black/35 text-foreground transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={
                selectedVariant?.stock === 0 ? "Out of stock" : "Add to cart"
              }
            >
              <ShoppingCart size={16} />
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
            className="btn-text mt-4 h-12 w-full bg-primary px-4 text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy Now
          </button>

          {selectedVariant && selectedVariant.stock <= 10 && selectedVariant.stock > 0 && (
            <p className="eyebrow-xs mt-2.5 text-warning">
              Only {selectedVariant.stock} left in stock
            </p>
          )}

          <div className="mt-6 grid grid-cols-3 border-y border-border py-4">
            <div className="text-center">
              <Truck size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="eyebrow-xs text-muted">Free Shipping</p>
            </div>
            <div className="text-center">
              <Shield size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="eyebrow-xs text-muted">CE Certified</p>
            </div>
            <div className="text-center">
              <RotateCcw size={16} className="mx-auto mb-1 text-primary/85" />
              <p className="eyebrow-xs text-muted">30 Day Returns</p>
            </div>
          </div>

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/products?tag=${tag}`}
                  className="eyebrow-xs border border-border bg-black/35 px-2.5 py-1.5 text-muted transition-colors hover:border-accent hover:text-foreground"
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
              className={`label-text border-b-2 pb-3 transition-colors ${
                activeTab === "description"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`label-text border-b-2 pb-3 transition-colors ${
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
            <div className="text-foreground">
              <p className="body-copy whitespace-pre-line">{product.description}</p>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="border border-border bg-card/50 p-4 sm:p-5">
                <h3 className="label-text text-foreground">
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
                  className="mt-4 w-full border border-border bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted focus:border-primary"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="meta-text text-muted">
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
                        className="btn-text border border-border px-4 py-2.5 text-muted transition-colors hover:text-foreground"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="btn-text border border-primary px-4 py-2.5 text-primary transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submittingReview
                        ? editingReviewId
                          ? "Updating..."
                          : "Submitting..."
                        : editingReviewId
                        ? "Update Review"
                        : "Submit"}
                    </button>
                  </div>
                </div>
              </section>

              {reviewsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((idx) => (
                    <ReviewCardSkeleton key={idx} />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center">
                  <Star size={36} className="mx-auto mb-3 text-muted/35" />
                  <h3 className="text-lg text-foreground">No Reviews Yet</h3>
                  <p className="meta-text mt-2 text-muted">Be the first to review this product.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <article key={review._id} className="border border-border bg-card/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold leading-snug text-foreground">{review.user.name}</p>
                            {review.isVerifiedPurchase && (
                              <span className="eyebrow-xs border border-success/40 bg-success/10 px-2 py-0.5 text-success">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                          <p className="meta-text mt-0.5 text-muted">
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
                      <p className="body-copy mt-3 whitespace-pre-line text-muted">{review.comment}</p>
                      {user && review.user.id === user.id && (
                        <div className="mt-3 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReview(review)}
                            className="btn-text border border-border px-3 py-1.5 text-muted transition-colors hover:text-foreground"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review._id)}
                            className="btn-text border border-danger/40 px-3 py-1.5 text-danger transition-colors hover:bg-danger/10"
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
                        className="btn-text border border-border px-4 py-2.5 text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
          <h2 className="section-title mb-6 text-2xl text-foreground sm:text-3xl">
            {product.relatedProductsHeading?.trim() || "Related products"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-14">
            {relatedProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
