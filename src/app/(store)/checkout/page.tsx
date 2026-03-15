import { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout - Motoego+",
  description: "Complete your order securely with Razorpay payment.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
