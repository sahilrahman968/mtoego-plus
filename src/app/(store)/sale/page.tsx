import { Metadata } from "next";
import { theme } from "@/config/theme";
import SalesIndexClient from "./SalesIndexClient";

export const metadata: Metadata = {
  title: "Jewellery Sale",
  description: `Explore current ${theme.brand.name} offers and limited-time pricing on selected jewellery.`,
  alternates: { canonical: "/sale" },
};

export default function SalesIndexPage() {
  return (
    <div className="mx-auto w-full max-w-[92rem] px-3 py-10 sm:px-4 lg:px-6">
      <p className="eyebrow mb-3 text-primary/90">Limited drops</p>
      <h1 className="section-title mb-8 text-3xl text-foreground sm:text-4xl">Sales</h1>
      <SalesIndexClient />
    </div>
  );
}
