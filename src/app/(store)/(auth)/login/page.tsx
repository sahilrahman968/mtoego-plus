import { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login - Motoego+",
  description: "Sign in to your Motoego+ account to access your orders, wishlist, and more.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
