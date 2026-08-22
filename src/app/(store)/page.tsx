import { Metadata } from "next";
import { theme } from "@/config/theme";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: theme.brand.tagline,
  description: theme.brand.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${theme.brand.name} — ${theme.brand.tagline}`,
    description: theme.brand.description,
    url: "/",
    type: "website",
  },
};

export default function HomePage() {
  return <HomeClient />;
}
