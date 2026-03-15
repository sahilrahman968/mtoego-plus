"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  ShoppingCart,
  Minus,
  Plus,
  Star,
  Truck,
  Shield,
  RotateCcw,
  ChevronRight,
  Share2,
  Check,
} from "lucide-react";
import ProductCard from "@/components/store/ProductCard";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/store/Toast";
import {
  fetchProduct,
  fetchProducts,
  addToWishlist,
  type ProductData,
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
  const { isAuthenticated } = useAuth();
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

  useEffect(() => {
    setLoading(true);
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

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product?.title,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied!", "success");
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="aspect-square bg-gray-100 rounded-xl animate-pulse-slow" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-100 rounded w-1/4 animate-pulse-slow" />
            <div className="h-8 bg-gray-100 rounded w-3/4 animate-pulse-slow" />
            <div className="h-6 bg-gray-100 rounded w-1/3 animate-pulse-slow" />
            <div className="h-24 bg-gray-100 rounded animate-pulse-slow" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Product Not Found</h1>
        <p className="text-muted mt-2">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted mb-6 overflow-x-auto">
        <Link href="/" className="hover:text-foreground shrink-0">
          Home
        </Link>
        <ChevronRight size={14} />
        <Link href="/products" className="hover:text-foreground shrink-0">
          Products
        </Link>
        {product.category && (
          <>
            <ChevronRight size={14} />
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-foreground shrink-0"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-foreground truncate">{product.title}</span>
      </nav>

      {/* Product Grid */}
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden">
            <Image
              src={getProductImage(product.images, selectedImage)}
              alt={product.images?.[selectedImage]?.alt || product.title}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            {discount > 0 && (
              <div className="absolute top-4 left-4 bg-danger text-white text-sm font-bold px-3 py-1 rounded-lg">
                -{discount}%
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                    selectedImage === idx
                      ? "border-primary"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.title} ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-xs font-medium text-primary uppercase tracking-wide hover:underline"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">
            {product.title}
          </h1>

          {/* Rating placeholder */}
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  className={
                    s <= 4 ? "fill-gray-400 text-gray-400" : "text-gray-200"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-muted">4.0 (Reviews)</span>
          </div>

          {/* Price */}
          {selectedVariant && (
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-foreground">
                {formatPrice(selectedVariant.price)}
              </span>
              {selectedVariant.compareAtPrice &&
                selectedVariant.compareAtPrice > selectedVariant.price && (
                  <span className="text-lg text-muted line-through">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                )}
              {discount > 0 && (
                <span className="text-sm font-medium text-success bg-gray-50 px-2 py-0.5 rounded">
                  Save {discount}%
                </span>
              )}
            </div>
          )}

          <p className="text-xs text-muted mt-1">Inclusive of all taxes</p>

          {/* Variant Selection - Colors */}
          {uniqueColors.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Color:{" "}
                <span className="font-normal text-muted">
                  {selectedVariant?.color || "-"}
                </span>
              </h3>
              <div className="flex gap-2 flex-wrap">
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
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary-light text-primary font-medium"
                          : matchingVariant && matchingVariant.stock > 0
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40 cursor-not-allowed line-through"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant Selection - Sizes */}
          {uniqueSizes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">
                Size:{" "}
                <span className="font-normal text-muted">
                  {selectedVariant?.size || "-"}
                </span>
              </h3>
              <div className="flex gap-2 flex-wrap">
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
                      className={`w-12 h-12 text-sm rounded-lg border font-medium transition-all ${
                        isSelected
                          ? "border-primary bg-primary-light text-primary"
                          : matchingVariant && matchingVariant.stock > 0
                          ? "border-border hover:border-primary/50"
                          : "border-border opacity-40 cursor-not-allowed line-through"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Quantity</h3>
            <div className="inline-flex items-center border border-border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() =>
                  setQuantity(
                    Math.min(selectedVariant?.stock || 50, quantity + 1)
                  )
                }
                className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {selectedVariant && selectedVariant.stock <= 10 && selectedVariant.stock > 0 && (
              <p className="text-xs text-warning mt-1">
                Only {selectedVariant.stock} left in stock
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddToCart}
              disabled={
                addingToCart ||
                !selectedVariant ||
                selectedVariant.stock === 0
              }
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingToCart ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : selectedVariant?.stock === 0 ? (
                "Out of Stock"
              ) : (
                <>
                  <ShoppingCart size={18} />
                  Add to Cart
                </>
              )}
            </button>
            <button
              onClick={handleAddToWishlist}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-border rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Heart size={18} />
              <span className="sm:hidden lg:inline">Wishlist</span>
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center w-12 h-12 border border-border rounded-xl hover:bg-gray-50 transition-colors shrink-0"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <Truck size={20} className="mx-auto text-muted mb-1" />
              <p className="text-xs text-muted">Free Delivery</p>
            </div>
            <div className="text-center">
              <Shield size={20} className="mx-auto text-muted mb-1" />
              <p className="text-xs text-muted">Genuine Product</p>
            </div>
            <div className="text-center">
              <RotateCcw size={20} className="mx-auto text-muted mb-1" />
              <p className="text-xs text-muted">Easy Returns</p>
            </div>
          </div>

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/products?tag=${tag}`}
                  className="text-xs px-2.5 py-1 bg-gray-100 text-muted rounded-full hover:bg-gray-200 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Description / Reviews */}
      <div className="mt-12 sm:mt-16">
        <div className="border-b border-border">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
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
                    <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                      <thead className="bg-gray-50">
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
            <div className="text-center py-12">
              <Star size={40} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">
                No Reviews Yet
              </h3>
              <p className="text-sm text-muted mt-1">
                Be the first to review this product
              </p>
              <button className="mt-4 px-4 py-2 text-sm font-medium text-primary border border-primary rounded-lg hover:bg-primary-light transition-colors">
                Write a Review
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12 sm:mt-16">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">
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
