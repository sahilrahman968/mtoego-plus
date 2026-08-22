import { Metadata } from "next";
import { Suspense } from "react";
import { theme } from "@/config/theme";
import SearchClient from "./SearchClient";

export const metadata: Metadata = {
  title: "Search Jewellery",
  description: `Search the ${theme.brand.name} catalogue for jewellery, rings, necklaces, and more.`,
  robots: { index: false, follow: true },
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
