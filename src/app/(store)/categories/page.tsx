import { Metadata } from "next";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Categories - Motoego+",
  description: "Browse all product categories. Find exactly what you're looking for.",
};

export default function CategoriesPage() {
  return <CategoriesClient />;
}
