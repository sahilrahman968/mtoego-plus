import { Metadata } from "next";
import { Suspense } from "react";
import { theme } from "@/config/theme";
import OrderSuccessClient from "./OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order Confirmed",
  description: `Your ${theme.brand.name} order has been placed successfully.`,
  robots: { index: false, follow: false },
};

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessClient />
    </Suspense>
  );
}
