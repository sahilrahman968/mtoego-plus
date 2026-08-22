import { Metadata } from "next";
import { theme } from "@/config/theme";
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
    title: `${formatted} Jewellery`,
    description: `Browse ${formatted.toLowerCase()} jewellery from ${theme.brand.name}. Discover contemporary pieces for everyday wear and special moments.`,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: {
      title: `${formatted} Jewellery | ${theme.brand.name}`,
      description: `Explore the ${formatted.toLowerCase()} jewellery collection from ${theme.brand.name}.`,
      url: `/categories/${slug}`,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryProductsClient slug={slug} />;
}
