import { Metadata } from "next";
import { theme } from "@/config/theme";
import SaleDetailClient from "./SaleDetailClient";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${title} Jewellery Sale`,
    description: `Explore ${title}, a limited-time ${theme.brand.name} offer on selected jewellery.`,
    alternates: { canonical: `/sale/${slug}` },
    openGraph: {
      title: `${title} Jewellery Sale | ${theme.brand.name}`,
      description: `Limited-time pricing on selected ${theme.brand.name} jewellery.`,
      url: `/sale/${slug}`,
    },
  };
}

export default async function SaleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <SaleDetailClient slug={slug} />;
}
