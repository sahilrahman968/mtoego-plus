import { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Motoego+ - Your One-Stop Online Store",
  description:
    "Discover amazing products at the best prices. Free shipping on orders above ₹999. Shop now for quality products with secure checkout.",
  openGraph: {
    title: "Motoego+ - Your One-Stop Online Store",
    description: "Discover amazing products at the best prices.",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
