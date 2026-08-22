import { Metadata } from "next";
import { theme } from "@/config/theme";

export const metadata: Metadata = {
  title: "Sign In",
  description: `Sign in to your ${theme.brand.name} account to access your orders and wishlist.`,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return null;
}
