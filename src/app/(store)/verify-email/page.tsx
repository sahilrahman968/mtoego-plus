import { Metadata } from "next";
import { Suspense } from "react";
import { theme } from "@/config/theme";
import VerifyEmailClient from "./VerifyEmailClient";

export const metadata: Metadata = {
  title: "Verify Email",
  description: `Verify your email address to activate your ${theme.brand.name} account.`,
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailClient />
    </Suspense>
  );
}
