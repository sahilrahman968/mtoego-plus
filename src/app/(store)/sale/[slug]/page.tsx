import { Metadata } from "next";
import SaleDetailClient from "./SaleDetailClient";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")} | Sale | Motoego+`,
    description: "Limited-time sale pricing on selected motorcycle gear.",
  };
}

export default async function SaleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <SaleDetailClient slug={slug} />;
}
