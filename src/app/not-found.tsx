import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import Header from "@/components/store/Header";
import Footer from "@/components/store/Footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen min-w-0 flex-col overflow-x-clip bg-background text-foreground">
      <Header />
      <main className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-5 text-primary/90">404 / Off Route</p>
          <p
            aria-hidden="true"
            className="section-title select-none text-[clamp(6rem,22vw,11rem)] leading-none text-foreground/[0.06]"
          >
            404
          </p>
          <h1 className="section-title -mt-10 text-3xl text-foreground sm:-mt-14 sm:text-5xl">
            Page Not Found
          </h1>
          <p className="body-copy mx-auto mt-4 max-w-md text-muted">
            This trail goes nowhere. The page you&apos;re looking for was moved,
            removed, or never existed.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/"
              className="btn-text inline-flex items-center gap-2 bg-primary px-6 py-3.5 text-white transition-colors hover:bg-primary-dark"
            >
              Back Home <ArrowRight size={16} />
            </Link>
            <Link
              href="/products"
              className="btn-text inline-flex items-center gap-2 border border-border/80 bg-black/40 px-6 py-3.5 text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white"
            >
              <Compass size={16} /> Shop All Gear
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {[
              { href: "/categories", label: "Categories" },
              { href: "/sale", label: "Sales" },
              { href: "/search", label: "Search" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="eyebrow text-muted transition-colors hover:text-primary"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
