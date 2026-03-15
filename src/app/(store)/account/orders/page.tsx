import { Metadata } from "next";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: "My Orders - Motoego+",
  description: "View your order history and track your packages.",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
