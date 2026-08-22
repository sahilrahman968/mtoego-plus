import Link from "next/link";
import { ArrowUpRight, Gem, ShieldCheck, Sparkles } from "lucide-react";
import { theme } from "@/config/theme";

const footerGroups = [
  {
    title: "Discover",
    links: [
      ["New arrivals", "/products?sort=createdAt&order=desc"],
      ["All jewellery", "/products"],
      ["Categories", "/categories"],
      ["The edit", "/products?featured=true"],
    ],
  },
  {
    title: "Your account",
    links: [
      ["Sign in", "/login"],
      ["Orders", "/account/orders"],
      ["Wishlist", "/wishlist"],
      ["Shopping bag", "/cart"],
    ],
  },
  {
    title: "Client care",
    links: [
      ["Delivery & returns", "/cart"],
      ["Contact", `mailto:${theme.brand.supportEmail}`],
      ["Secure checkout", "/checkout"],
      ["Search", "/search"],
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-foreground text-background sm:mt-28">
      <div className="j-container grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.15fr_2fr] lg:gap-20">
        <div>
          <Link href="/" className="font-display text-4xl font-medium tracking-[-0.04em]">
            {theme.brand.name}
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-background/65">
            {theme.brand.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-5 text-xs uppercase tracking-[0.14em] text-background/70">
            <span className="inline-flex items-center gap-2"><Gem className="size-4" /> Considered selection</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" /> Secure payment</span>
            <span className="inline-flex items-center gap-2"><Sparkles className="size-4" /> Personal client care</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.17em] text-background/45">
                {group.title}
              </h2>
              <ul className="space-y-3.5">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-background/75 transition-colors hover:text-background">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-background/15">
        <div className="j-container flex flex-col gap-3 py-5 text-[11px] uppercase tracking-[0.13em] text-background/45 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {theme.brand.name}. All rights reserved.</p>
          <a href={`mailto:${theme.brand.supportEmail}`} className="inline-flex items-center gap-1.5 hover:text-background">
            {theme.brand.supportEmail}<ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  );
}
