import { Metadata } from "next";
import CategoryProductsClient from "./CategoryProductsClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const formatted = slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${formatted} - Motoego+`,
    description: `Browse our collection of ${formatted.toLowerCase()} products.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryProductsClient slug={slug} />;
}
