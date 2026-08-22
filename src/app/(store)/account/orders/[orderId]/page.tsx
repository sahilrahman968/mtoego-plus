import { Metadata } from "next";
import { theme } from "@/config/theme";
import OrderDetailClient from "./OrderDetailClient";

export const metadata: Metadata = {
  title: "Order Details",
  description: `View your ${theme.brand.name} order details and delivery information.`,
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  return <OrderDetailClient orderId={orderId} />;
}
