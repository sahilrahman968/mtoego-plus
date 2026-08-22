import { Metadata } from "next";
import { theme } from "@/config/theme";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Jewellery Categories",
  description: `Explore ${theme.brand.name} jewellery by category and find pieces for everyday wear, celebrations, and meaningful gifts.`,
  alternates: { canonical: "/categories" },
};

export default function CategoriesPage() {
  return <CategoriesClient />;
}
