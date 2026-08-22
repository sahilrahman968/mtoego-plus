import { Metadata } from "next";
import { theme } from "@/config/theme";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: `Complete your ${theme.brand.name} jewellery order securely.`,
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
