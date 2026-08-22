"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { fetchNavSales } from "@/lib/store-api";
import { formatPrice, getProductImage } from "@/lib/utils";
import { theme } from "@/config/theme";

type Panel = "menu" | "search" | "cart" | null;

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { items, itemCount } = useCart();
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [sale, setSale] = useState<{ slug: string; title: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetchNavSales()
      .then((result) => {
        if (result.success && result.data?.items[0]) setSale(result.data.items[0]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPanel(null));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [panel]);

  const openPanel = (nextPanel: Exclude<Panel, null>) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setPanel(nextPanel);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    setPanel(null);
    router.push(value ? `/search?q=${encodeURIComponent(value)}` : "/search");
  };

  const handleLogout = async () => {
    await logout();
    setPanel(null);
    router.push("/");
  };

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const subtotal = items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

  const navItems = [
    { href: "/products?sort=createdAt&order=desc", label: "New arrivals" },
    { href: "/categories", label: "Jewellery" },
    { href: "/products?featured=true", label: "The edit" },
    ...(sale ? [{ href: `/sale/${sale.slug}`, label: "Private sale" }] : []),
  ];

  return (
    <>
      {theme.announcement.enabled && (
        <div className="bg-foreground px-4 py-2 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-background sm:text-[11px]">
          {theme.announcement.text}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="j-container grid h-16 grid-cols-[1fr_auto_1fr] items-center lg:h-20">
          <button
            type="button"
            onClick={() => openPanel("menu")}
            className="j-icon-button -ml-3 justify-self-start lg:hidden"
            aria-label="Open menu"
            aria-expanded={panel === "menu"}
          >
            <Menu aria-hidden="true" />
          </button>

          <nav
            className="col-start-1 hidden items-center gap-5 lg:flex xl:gap-7"
            aria-label="Primary navigation"
          >
            {navItems.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`j-nav-link whitespace-nowrap ${active(item.href.split("?")[0]) ? "text-primary" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            className="col-start-2 px-4 text-center font-display text-[2rem] font-medium leading-none tracking-[-0.04em] text-foreground lg:text-[2.35rem]"
            aria-label={`${theme.brand.name} home`}
          >
            {theme.brand.name}
          </Link>

          <div className="col-start-3 -mr-3 flex items-center justify-end gap-0.5">
            <nav
              className="mr-3 hidden items-center gap-5 lg:flex xl:mr-5 xl:gap-7"
              aria-label="Featured navigation"
            >
              {navItems.slice(2).map((item) => (
                <Link key={item.href} href={item.href} className="j-nav-link whitespace-nowrap">
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              className="j-icon-button"
              onClick={() => openPanel("search")}
              aria-label="Search"
            >
              <Search aria-hidden="true" />
            </button>
            <Link href="/wishlist" className="j-icon-button hidden sm:grid" aria-label="Wishlist">
              <Heart aria-hidden="true" />
            </Link>
            <Link
              href={isAuthenticated ? "/account/orders" : "/login"}
              className="j-icon-button hidden sm:grid"
              aria-label={isAuthenticated ? "Account" : "Sign in"}
            >
              <User aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="j-icon-button relative"
              onClick={() => openPanel("cart")}
              aria-label={`Shopping bag with ${itemCount} items`}
            >
              <ShoppingBag aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-semibold text-white">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {panel && (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
            aria-label="Close panel"
            onClick={() => setPanel(null)}
          />
          <aside
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={panel === "search" ? "Search" : panel === "cart" ? "Shopping bag" : "Menu"}
            className={`absolute bg-background shadow-2xl ${
              panel === "search"
                ? "inset-x-0 top-0 min-h-64 border-b border-border"
                : "right-0 top-0 h-dvh w-[min(92vw,28rem)] border-l border-border"
            }`}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setPanel(null)}
              className="j-icon-button absolute right-4 top-4 z-10"
              aria-label="Close"
            >
              <X aria-hidden="true" />
            </button>

            {panel === "search" && (
              <div className="j-container py-16 sm:py-20">
                <p className="eyebrow mb-5 text-primary">Find your piece</p>
                <form onSubmit={submitSearch} className="flex border-b border-foreground">
                  <label htmlFor="site-search" className="sr-only">
                    Search products
                  </label>
                  <input
                    id="site-search"
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, category or style"
                    className="min-w-0 flex-1 bg-transparent py-3 font-display text-2xl text-foreground outline-none placeholder:text-muted/65 sm:text-4xl"
                  />
                  <button type="submit" className="j-icon-button" aria-label="Submit search">
                    <Search aria-hidden="true" />
                  </button>
                </form>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs uppercase tracking-[0.14em] text-muted">
                  <Link href="/products?sort=createdAt&order=desc">New arrivals</Link>
                  <Link href="/products?featured=true">Featured pieces</Link>
                  <Link href="/categories">Browse categories</Link>
                </div>
              </div>
            )}

            {panel === "menu" && (
              <div className="flex h-full flex-col px-6 pb-8 pt-20">
                <p className="eyebrow mb-6 text-primary">Discover</p>
                <nav className="space-y-1" aria-label="Mobile navigation">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block border-b border-border py-4 font-display text-3xl"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/search" className="block border-b border-border py-4 font-display text-3xl">
                    Search
                  </Link>
                </nav>
                <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
                  <Link href="/wishlist" className="j-button-secondary">
                    <Heart className="size-4" aria-hidden="true" /> Wishlist
                  </Link>
                  <Link href={isAuthenticated ? "/account/orders" : "/login"} className="j-button-secondary">
                    <User className="size-4" aria-hidden="true" /> Account
                  </Link>
                </div>
                {isAuthenticated && (
                  <button type="button" onClick={handleLogout} className="mt-3 j-text-link justify-start text-danger">
                    <LogOut className="size-4" aria-hidden="true" /> Sign out
                  </button>
                )}
              </div>
            )}

            {panel === "cart" && (
              <div className="flex h-full flex-col">
                <div className="border-b border-border px-6 py-6 pr-16">
                  <p className="eyebrow text-primary">Your selection</p>
                  <h2 className="mt-1 text-3xl">Shopping bag</h2>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {!isAuthenticated ? (
                    <div className="flex min-h-64 flex-col items-center justify-center text-center">
                      <ShoppingBag className="mb-4 size-7 text-primary" aria-hidden="true" />
                      <h3 className="text-2xl">Your bag awaits</h3>
                      <p className="mt-2 max-w-xs text-sm text-muted">Sign in to see and save your selected pieces.</p>
                      <Link href="/login?redirect=/cart" className="j-button-primary mt-6">
                        Sign in
                      </Link>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center text-center">
                      <ShoppingBag className="mb-4 size-7 text-primary" aria-hidden="true" />
                      <h3 className="text-2xl">Your bag is empty</h3>
                      <Link href="/products" className="j-text-link mt-5">
                        Explore the collection
                      </Link>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {items.map((item) => (
                        <li key={item._id} className="flex gap-4 py-5">
                          <div className="relative size-24 shrink-0 overflow-hidden bg-card-hover">
                            {item.product && (
                              <Image
                                src={getProductImage(item.product.images)}
                                alt=""
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link href={item.product ? `/products/${item.product.slug}` : "/cart"} className="font-display text-lg">
                              {item.product?.title || "Unavailable piece"}
                            </Link>
                            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-muted">Quantity {item.quantity}</p>
                            <p className="mt-2 text-sm">{formatPrice(item.priceAtAdd * item.quantity)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {isAuthenticated && items.length > 0 && (
                  <div className="border-t border-border bg-card px-6 py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-muted">Estimated subtotal</span>
                      <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    <Link href="/cart" className="j-button-primary w-full">
                      View bag
                    </Link>
                    <p className="mt-3 text-center text-[11px] text-muted">Taxes and shipping are calculated at checkout.</p>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
