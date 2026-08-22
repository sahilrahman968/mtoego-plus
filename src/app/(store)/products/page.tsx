import { Metadata } from "next";
import { Suspense } from "react";
import { theme } from "@/config/theme";
import ProductsClient from "./ProductsClient";

export const metadata: Metadata = {
  title: "Shop All Jewellery",
  description: `Browse the complete ${theme.brand.name} jewellery collection, including rings, necklaces, and contemporary pieces for everyday moments and celebrations.`,
  alternates: { canonical: "/products" },
  openGraph: {
    title: `Shop All Jewellery | ${theme.brand.name}`,
    description: theme.brand.description,
    url: "/products",
  },
};

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsClient />
    </Suspense>
  );
}
