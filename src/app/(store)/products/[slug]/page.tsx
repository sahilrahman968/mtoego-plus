import { Metadata } from "next";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/products/${slug}`,
      { next: { revalidate: 60 } }
    );
    const json = await res.json();
    if (json.success && json.data) {
      const product = json.data;
      return {
        title: `${product.title} - Motoego+`,
        description: product.description?.slice(0, 160),
        openGraph: {
          title: product.title,
          description: product.description?.slice(0, 160),
          images: product.images?.[0]?.url ? [product.images[0].url] : [],
        },
      };
    }
  } catch {
    // fallback
  }
  return {
    title: "Product - Motoego+",
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
