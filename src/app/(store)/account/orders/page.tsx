import { Metadata } from "next";
import { theme } from "@/config/theme";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: "My Orders",
  description: `View your ${theme.brand.name} order history and delivery details.`,
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return <OrdersClient />;
}
