import type { Metadata } from "next";
import Link from "next/link";
import { theme } from "@/config/theme";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: `The requested ${theme.brand.name} page could not be found.`,
  robots: { index: false, follow: true },
};

export default function StoreNotFound() {
  return (
    <section className="mx-auto flex min-h-[55vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="eyebrow mb-3 text-primary">404</p>
      <h1 className="section-title text-4xl text-foreground">This page is not here</h1>
      <p className="mt-4 max-w-lg text-muted">
        The page may have moved, or the jewellery you are looking for may no longer
        be available.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/products"
          className="min-h-11 rounded-sm bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Shop jewellery
        </Link>
        <Link
          href="/"
          className="min-h-11 rounded-sm border border-border px-6 py-3 font-semibold text-foreground transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Return home
        </Link>
      </div>
    </section>
  );
}
