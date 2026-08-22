import { Metadata } from "next";
import { theme } from "@/config/theme";
import CartClient from "./CartClient";

export const metadata: Metadata = {
  title: "Shopping Cart",
  description: `Review the ${theme.brand.name} jewellery in your shopping cart before checkout.`,
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartClient />;
}
