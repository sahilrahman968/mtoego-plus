import { Metadata } from "next";
import { cache } from "react";
import { theme } from "@/config/theme";
import type { ProductData } from "@/lib/store-api";
import { priceInclGst } from "@/lib/pricing";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

const getProduct = cache(async (slug: string): Promise<ProductData | null> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/products/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } }
    );

    if (!res.ok) return null;

    const json = (await res.json()) as {
      success?: boolean;
      data?: ProductData;
    };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (product) {
    const description = product.description?.slice(0, 160) || theme.brand.description;
    const images = product.images.map((image) => ({
      url: image.url,
      alt: image.alt || product.title,
    }));

    return {
      title: product.title,
      description,
      keywords: product.tags,
      alternates: { canonical: `/products/${product.slug}` },
      openGraph: {
        title: `${product.title} | ${theme.brand.name}`,
        description,
        url: `/products/${product.slug}`,
        images,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${product.title} | ${theme.brand.name}`,
        description,
        images: images.map((image) => image.url),
      },
    };
  }

  return {
    title: "Jewellery Product",
    description: theme.brand.description,
    robots: { index: false, follow: true },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const purchasableVariants =
    product?.variants.filter((variant) => variant.isActive !== false) ?? [];
  const consumerPrices = purchasableVariants.map((variant) =>
    priceInclGst(variant.price, variant.gst)
  );
  const structuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description,
        image: product.images.map((image) => image.url),
        sku: product.variants[0]?.sku,
        category: product.category?.name,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/products/${product.slug}`,
        keywords: product.tags.join(", "),
        dateCreated: product.createdAt,
        dateModified: product.updatedAt,
        ...(consumerPrices.length
          ? {
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "INR",
                lowPrice: Math.min(...consumerPrices),
                highPrice: Math.max(...consumerPrices),
                offerCount: purchasableVariants.length,
                availability: purchasableVariants.some((variant) => variant.stock > 0)
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/products/${product.slug}`,
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      <ProductDetailClient slug={slug} />
    </>
  );
}
