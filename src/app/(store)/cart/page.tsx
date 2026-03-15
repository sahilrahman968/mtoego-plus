import { Metadata } from "next";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Shopping Cart - ShopNow",
  description: "Review your cart items and proceed to checkout.",
};

export default function CartPage() {
  return <CartClient />;
}
