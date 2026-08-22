import { Metadata } from "next";
import { theme } from "@/config/theme";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "Wishlist",
  description: `View your saved ${theme.brand.name} jewellery and add pieces to your cart when you are ready.`,
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
