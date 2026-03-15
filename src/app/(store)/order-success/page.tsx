import { Metadata } from "next";
import { Suspense } from "react";
import OrderSuccessClient from "./OrderSuccessClient";

export const metadata: Metadata = {
  title: "Order Confirmed - Motoego+",
  description: "Your order has been placed successfully!",
};

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessClient />
    </Suspense>
  );
}
