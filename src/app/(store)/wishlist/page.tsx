import { Metadata } from "next";
import WishlistClient from "./WishlistClient";

export const metadata: Metadata = {
  title: "Wishlist - Motoego+",
  description: "Your saved products. Add items to your cart when you're ready.",
};

export default function WishlistPage() {
  return <WishlistClient />;
}
