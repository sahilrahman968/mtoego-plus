"use client";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Mail,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import ProductCard from "@/components/jewellery/catalog/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/jewellery/shared/Toast";
import {
  fetchProduct,
  fetchProducts,
  fetchProductReviews,
  submitProductReview,
  updateProductReview,
  deleteProductReview,
  addToWishlist,
  type ProductData,
  type ProductImageData,
  type ProductReviewData,
  type ProductReviewsData,
  type ProductVariantData,
} from "@/lib/store-api";
import {
  formatPrice,
  getProductImage,
  getDiscountPercent,
} from "@/lib/utils";
import { calculateShipping, priceInclGst } from "@/lib/pricing";
import { trackRecentlyViewed } from "@/lib/recently-viewed";
import { theme } from "@/config/theme";
import {
  ProductDetailSkeleton,
  ReviewCardSkeleton,
} from "@/components/jewellery/shared/Skeletons";

const RATING_VALUES = [1, 2, 3, 4, 5];

/** Index of the first image tagged with the given color, or 0 when none match. */
function imageIndexForColor(
  images: ProductData["images"],
  color?: string
): number {
  if (!color) return 0;
  const index = images.findIndex((image) => image.color === color);
  return index === -1 ? 0 : index;
}

/** Decorative star row. Always pair with a text equivalent for screen readers. */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {RATING_VALUES.map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.5}
          className={
            star <= Math.round(value) ? "fill-primary text-primary" : "text-border"
          }
        />
      ))}
    </span>
  );
}

function SelectableChip({
  label,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-11 min-w-16 cursor-pointer border px-4 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
        selected
          ? "border-foreground bg-foreground text-background"
          : disabled
          ? "cursor-not-allowed border-border text-muted/55 line-through"
          : "border-border bg-card text-foreground hover:border-foreground"
      }`}
    >
      {label}
    </button>
  );
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

  const galleryRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const animatingToIndex = useRef<number | null>(null);
  const inlineCtaRef = useRef<HTMLDivElement>(null);
  const pageEndRef = useRef<HTMLDivElement>(null);
  const [inlineCtaVisible, setInlineCtaVisible] = useState(true);
  const [pageEndVisible, setPageEndVisible] = useState(false);

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

  const slides = useMemo<ProductImageData[]>(
    () =>
      images.length > 0
        ? images
        : [{ url: getProductImage(images), publicId: "placeholder" }],
    [images]
  );

  // Keeps the mobile swipe track and the desktop rail aligned when a colour
  // selection moves the image.
  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const track = galleryRef.current;
    if (!track || !track.clientWidth) return;
    const target = selectedImage * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) < 8) {
      animatingToIndex.current = null;
      return;
    }
    animatingToIndex.current = selectedImage;
    track.scrollTo({ left: target, behavior: "smooth" });
  }, [selectedImage]);

  // Intermediate frames of a smooth scroll would otherwise be read back as a
  // user swipe and cancel the animation half way.
  const handleTrackScroll = useCallback(() => {
    const track = galleryRef.current;
    if (!track || !track.clientWidth) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    if (animatingToIndex.current !== null) {
      if (index === animatingToIndex.current) animatingToIndex.current = null;
      return;
    }
    setSelectedImage((current) =>
      index !== current && index >= 0 && index < slides.length ? index : current
    );
  }, [slides.length]);

  // The mobile purchase bar is redundant while the inline buttons are on screen,
  // and would sit on top of the footer at the end of the page.
  useEffect(() => {
    const targets = [inlineCtaRef.current, pageEndRef.current].filter(
      (node): node is HTMLDivElement => node !== null
    );
    if (targets.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === inlineCtaRef.current) setInlineCtaVisible(entry.isIntersecting);
        if (entry.target === pageEndRef.current) setPageEndVisible(entry.isIntersecting);
      }
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [product]);

  const standardShipping = useMemo(() => calculateShipping(0), []);

  const unitPrice = selectedVariant
    ? priceInclGst(selectedVariant.price, selectedVariant.gst)
    : 0;
  const comparePrice =
    selectedVariant?.compareAtPrice
      ? priceInclGst(selectedVariant.compareAtPrice, selectedVariant.gst)
      : undefined;
  const discount = getDiscountPercent(unitPrice, comparePrice);
  const inStock = !!selectedVariant && selectedVariant.stock > 0;
  const averageRating = reviewStats?.averageRating ?? 0;
  const totalReviews = reviewStats?.totalReviews ?? 0;

  const showImage = (index: number) => {
    if (index < 0 || index >= slides.length) return;
    setSelectedImage(index);
  };

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
      <div className="j-container py-10 sm:py-14">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="j-container py-24 text-center sm:py-32">
        <p className="eyebrow text-primary">Not found</p>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl">Piece unavailable</h1>
        <p className="body-copy mx-auto mt-4 text-muted">
          The piece you are looking for is no longer part of the collection.
        </p>
        <Link href="/products" className="j-button-primary mt-8">
          Explore the collection
        </Link>
      </div>
    );
  }

  const activeImage = slides[selectedImage] ?? slides[0];
  const stockNote =
    selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 10
      ? `Only ${selectedVariant.stock} left`
      : null;
  const showPurchaseBar = !inlineCtaVisible && !pageEndVisible;

  return (
    <>
      <div className="j-container pb-28 pt-6 sm:pt-8 lg:pb-24">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-6 text-[10px] uppercase tracking-[0.14em] text-muted no-scrollbar sm:text-[11px]"
        >
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-border" />
          <Link href="/products" className="transition-colors hover:text-foreground">
            Jewellery
          </Link>
          {product.category && (
            <>
              <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-border" />
              <Link
                href={`/categories/${product.category.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {product.category.name}
              </Link>
            </>
          )}
          <ChevronRight size={12} aria-hidden="true" className="shrink-0 text-border" />
          <span aria-current="page" className="text-foreground">
            {product.title}
          </span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,25rem)] lg:gap-14 xl:gap-20">
          <section aria-label="Product images">
            {/* Mobile / tablet: swipeable snap track */}
            <div className="relative lg:hidden">
              <div
                ref={galleryRef}
                onScroll={handleTrackScroll}
                onPointerDown={() => {
                  animatingToIndex.current = null;
                }}
                className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
                aria-roledescription="carousel"
                aria-label={`${product.title} images`}
              >
                {slides.map((image, index) => (
                  <div
                    key={`${image.publicId || image.url}-${index}`}
                    className="relative aspect-[4/5] w-full shrink-0 snap-center bg-[#EEE9E0]"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Image ${index + 1} of ${slides.length}`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt || `${product.title} — view ${index + 1}`}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>

              {inStock && discount > 0 && (
                <span className="absolute left-4 top-4 bg-background/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
                  Save {discount}%
                </span>
              )}
              {slides.length > 1 && (
                <span className="tabular absolute bottom-4 right-4 bg-foreground/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-background">
                  {selectedImage + 1} / {slides.length}
                </span>
              )}
            </div>

            {slides.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar lg:hidden">
                {slides.map((image, index) => (
                  <button
                    key={`thumb-${image.publicId || image.url}-${index}`}
                    type="button"
                    onClick={() => showImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={selectedImage === index}
                    className={`relative aspect-square w-16 shrink-0 cursor-pointer overflow-hidden border bg-[#EEE9E0] transition-colors duration-200 ${
                      selectedImage === index ? "border-foreground" : "border-transparent"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Desktop: thumbnail rail + large frame */}
            <div className="hidden gap-4 lg:grid lg:grid-cols-[5rem_minmax(0,1fr)]">
              {/* Absolute inner rail so a long image set scrolls instead of
                  stretching the row past the main frame. */}
              <div className="relative">
                <div
                  ref={railRef}
                  className="absolute inset-0 flex flex-col gap-3 overflow-y-auto no-scrollbar"
                >
                  {slides.map((image, index) => (
                    <button
                      key={`rail-${image.publicId || image.url}-${index}`}
                      type="button"
                      onClick={() => showImage(index)}
                      aria-label={`Show image ${index + 1}`}
                      aria-current={selectedImage === index}
                      data-active={selectedImage === index}
                      className={`relative aspect-[4/5] shrink-0 cursor-pointer overflow-hidden border bg-[#EEE9E0] transition-colors duration-200 ${
                        selectedImage === index
                          ? "border-foreground"
                          : "border-border hover:border-foreground/50"
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="group relative aspect-[4/5] overflow-hidden bg-[#EEE9E0]">
                <Image
                  key={activeImage?.url || "product-placeholder"}
                  src={getProductImage(slides, selectedImage)}
                  alt={activeImage?.alt || product.title}
                  fill
                  sizes="(min-width: 1024px) 52vw, 100vw"
                  className="object-cover"
                  priority
                />
                {inStock && discount > 0 && (
                  <span className="absolute left-5 top-5 bg-background/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
                    Save {discount}%
                  </span>
                )}
                {slides.length > 1 && (
                  <div className="absolute inset-x-5 bottom-5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => showImage(selectedImage - 1)}
                      disabled={selectedImage === 0}
                      aria-label="Previous image"
                      className="grid size-11 cursor-pointer place-items-center bg-background/90 text-foreground backdrop-blur transition-colors duration-200 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="size-5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => showImage(selectedImage + 1)}
                      disabled={selectedImage === slides.length - 1}
                      aria-label="Next image"
                      className="grid size-11 cursor-pointer place-items-center bg-background/90 text-foreground backdrop-blur transition-colors duration-200 hover:bg-foreground hover:text-background disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {product.category && (
              <Link
                href={`/categories/${product.category.slug}`}
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary transition-colors hover:text-primary-dark"
              >
                {product.category.name}
              </Link>
            )}

            <h1 className="mt-3 font-display text-3xl font-medium leading-[1.05] tracking-[-0.01em] sm:text-4xl">
              {product.title}
            </h1>

            {product.sale?.badgeLabel && (
              <Link
                href={`/sale/${product.sale.slug}`}
                className="mt-4 inline-flex items-center gap-2 border border-primary/45 bg-accent-light px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary transition-colors hover:border-primary"
              >
                {product.sale.badgeLabel}
              </Link>
            )}

            <a
              href="#reviews"
              className="mt-4 inline-flex items-center gap-2.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <Stars value={averageRating} />
              <span className="sr-only">
                {totalReviews > 0
                  ? `Rated ${averageRating.toFixed(1)} out of 5 from ${totalReviews} reviews.`
                  : "Not yet reviewed."}
              </span>
              <span aria-hidden="true" className="tabular">
                {totalReviews > 0
                  ? `${averageRating.toFixed(1)} · ${totalReviews} ${
                      totalReviews === 1 ? "review" : "reviews"
                    }`
                  : "No reviews yet"}
              </span>
            </a>

            <div className="mt-6 border-y border-border py-5">
              {selectedVariant ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="price font-display text-3xl font-medium text-foreground">
                      {formatPrice(unitPrice)}
                    </span>
                    {comparePrice && comparePrice > unitPrice && (
                      <span className="price text-sm text-muted line-through">
                        {formatPrice(comparePrice)}
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                        Save {discount}%
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">
                    Price includes GST
                  </p>
                  <p
                    className={`mt-3 text-xs font-semibold uppercase tracking-[0.12em] ${
                      inStock ? "text-success" : "text-danger"
                    }`}
                  >
                    {inStock ? stockNote ?? "In stock" : "Out of stock"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  This piece has no available options at the moment.
                </p>
              )}
            </div>

            {uniqueColors.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Finish
                  </h2>
                  <span className="text-xs text-foreground">
                    {selectedVariant?.color || "—"}
                  </span>
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
                    return (
                      <SelectableChip
                        key={color}
                        label={color as string}
                        selected={selectedVariant?.color === color}
                        disabled={!matchingVariant}
                        onSelect={() => {
                          if (!matchingVariant) return;
                          setSelectedImage(imageIndexForColor(images, color));
                          setSelectedVariant(matchingVariant);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {uniqueSizes.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Size
                  </h2>
                  <span className="text-xs text-foreground">
                    {selectedVariant?.size || "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => {
                    const matchingVariant = activeVariants.find(
                      (v) =>
                        v.size === size &&
                        (!selectedVariant?.color || v.color === selectedVariant.color)
                    );
                    return (
                      <SelectableChip
                        key={size}
                        label={size as string}
                        selected={selectedVariant?.size === size}
                        disabled={!matchingVariant || matchingVariant.stock === 0}
                        onSelect={() => {
                          if (matchingVariant) setSelectedVariant(matchingVariant);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-7 flex items-center gap-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Quantity
              </h2>
              <div className="inline-flex items-center border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="grid size-11 cursor-pointer place-items-center text-foreground transition-colors duration-200 hover:bg-card-hover disabled:cursor-not-allowed disabled:text-muted/50"
                >
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span
                  aria-live="polite"
                  className="tabular w-10 text-center text-sm font-medium"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity(Math.min(selectedVariant?.stock || 50, quantity + 1))
                  }
                  disabled={!!selectedVariant && quantity >= selectedVariant.stock}
                  aria-label="Increase quantity"
                  className="grid size-11 cursor-pointer place-items-center text-foreground transition-colors duration-200 hover:bg-card-hover disabled:cursor-not-allowed disabled:text-muted/50"
                >
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div ref={inlineCtaRef} className="mt-6 space-y-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart || !inStock}
                className="j-button-primary w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                {!inStock ? "Out of stock" : addingToCart ? "Adding…" : "Add to bag"}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={addingToCart || !inStock}
                className="j-button-secondary w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
              >
                Buy it now
              </button>
              <button
                type="button"
                onClick={handleAddToWishlist}
                className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors duration-200 hover:text-foreground"
              >
                <Heart className="size-4" aria-hidden="true" />
                Save to wishlist
              </button>
            </div>

            <dl className="mt-7 space-y-3 border-t border-border pt-6 text-xs leading-6 text-muted">
              <div className="flex gap-3">
                <Truck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-semibold uppercase tracking-[0.12em] text-foreground">
                    {standardShipping.method}
                  </dt>
                  <dd>
                    Estimated {standardShipping.estimatedDays} working days after
                    dispatch. Shipping is {formatPrice(standardShipping.cost)} flat and
                    free on larger orders — the exact amount is confirmed in your bag.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-semibold uppercase tracking-[0.12em] text-foreground">
                    Secure checkout
                  </dt>
                  <dd>
                    GST is included in the price shown. Final GST and shipping totals
                    appear at checkout before payment.
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="font-semibold uppercase tracking-[0.12em] text-foreground">
                    Returns &amp; client care
                  </dt>
                  <dd>
                    For delivery or return questions, write to{" "}
                    <a
                      href={`mailto:${theme.brand.supportEmail}`}
                      className="text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      {theme.brand.supportEmail}
                    </a>
                    .
                  </dd>
                </div>
              </div>
            </dl>

            {product.description && (
              <details className="group mt-6 border-t border-border pt-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                  Description
                  <Plus
                    className="size-4 text-muted transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="body-copy mt-4 whitespace-pre-line text-muted">
                  {product.description}
                </p>
              </details>
            )}

            {product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-6">
                {product.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/products?tag=${tag}`}
                    className="border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-muted transition-colors duration-200 hover:border-foreground hover:text-foreground"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}
          </aside>
        </div>

        <section id="reviews" aria-labelledby="reviews-heading" className="mt-20 sm:mt-28">
          <div className="border-t border-border pt-10">
            <p className="eyebrow text-primary">Client reviews</p>
            <h2 id="reviews-heading" className="mt-3 font-display text-3xl sm:text-4xl">
              What owners say
            </h2>
          </div>

          <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-end gap-4">
                <span className="price font-display text-5xl font-medium text-foreground">
                  {totalReviews > 0 ? averageRating.toFixed(1) : "—"}
                </span>
                <div className="pb-2">
                  <Stars value={averageRating} size={16} />
                  <p className="mt-1.5 text-xs text-muted">
                    {totalReviews > 0
                      ? `Based on ${totalReviews} ${
                          totalReviews === 1 ? "review" : "reviews"
                        }`
                      : "Not yet reviewed"}
                  </p>
                </div>
              </div>

              {totalReviews > 0 && reviewStats && (
                <ul className="mt-6 space-y-2">
                  {[...RATING_VALUES].reverse().map((star) => {
                    const count = reviewStats.ratingBreakdown?.[star] ?? 0;
                    const percent = totalReviews ? (count / totalReviews) * 100 : 0;
                    return (
                      <li key={star} className="flex items-center gap-3 text-xs text-muted">
                        <span className="tabular w-10 shrink-0">{star} star</span>
                        <span className="h-1.5 flex-1 bg-card-hover">
                          <span
                            className="block h-full bg-primary"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="tabular w-8 shrink-0 text-right">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-8 border border-border bg-card p-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                  {editingReviewId ? "Edit your review" : "Write a review"}
                </h3>

                <div
                  role="radiogroup"
                  aria-label="Your rating"
                  className="mt-4 flex items-center gap-1.5"
                >
                  {RATING_VALUES.map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={reviewRating === star}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      onClick={() => setReviewRating(star)}
                      className="cursor-pointer p-0.5"
                    >
                      <Star
                        size={20}
                        strokeWidth={1.5}
                        aria-hidden="true"
                        className={
                          star <= reviewRating
                            ? "fill-primary text-primary"
                            : "text-border"
                        }
                      />
                    </button>
                  ))}
                </div>

                <label htmlFor="review-comment" className="sr-only">
                  Your review
                </label>
                <textarea
                  id="review-comment"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share how this piece wears and how it arrived."
                  rows={4}
                  className="j-field mt-4 resize-y focus:border-foreground"
                />

                <p className="mt-3 text-[11px] leading-5 text-muted">
                  Reviews can be submitted once an order containing this piece has been
                  delivered.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="j-button-primary flex-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {submittingReview
                      ? editingReviewId
                        ? "Updating…"
                        : "Submitting…"
                      : editingReviewId
                      ? "Update review"
                      : "Submit review"}
                  </button>
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReviewId(null);
                        setReviewRating(5);
                        setReviewComment("");
                      }}
                      className="j-button-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              {reviewsLoading && reviews.length === 0 ? (
                <div>
                  {[1, 2, 3].map((idx) => (
                    <ReviewCardSkeleton key={idx} />
                  ))}
                </div>
              ) : reviews.length === 0 ? (
                <div className="border border-border bg-card px-6 py-16 text-center">
                  <Star
                    size={28}
                    strokeWidth={1.5}
                    className="mx-auto text-primary"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 font-display text-2xl">No reviews yet</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                    Be the first to share your experience with this piece.
                  </p>
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-border border-t border-border">
                    {reviews.map((review) => (
                      <li key={review._id} className="py-7">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <p className="font-display text-lg leading-snug text-foreground">
                                {review.user.name}
                              </p>
                              {review.isVerifiedPurchase && (
                                <span className="border border-success/40 bg-success/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-success">
                                  Verified purchase
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted">
                              {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div>
                            <Stars value={review.rating} />
                            <span className="sr-only">
                              Rated {review.rating} out of 5
                            </span>
                          </div>
                        </div>
                        <p className="body-copy mt-4 whitespace-pre-line text-muted">
                          {review.comment}
                        </p>
                        {user && review.user.id === user.id && (
                          <div className="mt-4 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.13em]">
                            <button
                              type="button"
                              onClick={() => handleEditReview(review)}
                              className="cursor-pointer text-muted transition-colors duration-200 hover:text-foreground"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(review._id)}
                              className="cursor-pointer text-danger transition-colors duration-200 hover:text-foreground"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {reviewsHasNextPage && (
                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => loadReviews(reviewsPage + 1, true)}
                        disabled={reviewsLoading || reviewsPage >= reviewsTotalPages}
                        className="j-button-secondary w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                      >
                        {reviewsLoading ? "Loading…" : "Load more reviews"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {relatedProducts.length > 0 && (
          <section aria-labelledby="related-heading" className="mt-20 sm:mt-28">
            <div className="border-t border-border pt-10">
              <p className="eyebrow text-primary">Complete the look</p>
              <h2 id="related-heading" className="mt-3 font-display text-3xl sm:text-4xl">
                You may also like
              </h2>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-10">
              {relatedProducts.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}

        <div ref={pageEndRef} aria-hidden="true" className="h-px" />
      </div>

      {/* Mobile purchase bar. Sits below the toast stack (z-100) on purpose. */}
      <div
        aria-hidden={!showPurchaseBar}
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl transition-transform duration-300 lg:hidden ${
          showPurchaseBar
            ? "translate-y-0"
            : "pointer-events-none invisible translate-y-full"
        }`}
      >
        <div className="j-container flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base leading-tight text-foreground">
              {product.title}
            </p>
            <p className="price mt-0.5 text-sm text-muted">
              {selectedVariant ? formatPrice(unitPrice) : "Unavailable"}
              {stockNote && <span className="ml-2 text-primary">{stockNote}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={addingToCart || !inStock}
            className="j-button-primary shrink-0 cursor-pointer px-5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {!inStock ? "Sold out" : addingToCart ? "Adding…" : "Add to bag"}
          </button>
        </div>
      </div>
    </>
  );
}
