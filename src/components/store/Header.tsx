"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { fetchNavSales } from "@/lib/store-api";

export default function Header() {
  const { isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navSale, setNavSale] = useState<{ title: string; slug: string } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNavSales()
      .then((res) => {
        if (res.success && res.data?.items?.length) {
          setNavSale(res.data.items[0]);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Pages with a full-bleed background image let content run under the header.
  const isFullBleed =
    pathname === "/" || pathname === "/login" || /^\/sale\/[^/]+$/.test(pathname);

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-transparent ${isFullBleed ? "-mb-[4.5rem]" : ""}`}
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[7.5rem] bg-gradient-to-b from-black/70 via-black/35 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_0%,black_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_40%,transparent_100%)]"
        />
        <div className="relative mx-auto flex h-[4.5rem] max-w-[92rem] items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <Link
              href="/"
              className="relative block h-9 w-[10.25rem] shrink-0 overflow-hidden sm:h-10 sm:w-[11.25rem]"
              aria-label="Motoego Home"
            >
              <Image
                src="/logo.svg"
                alt="Motoego"
                fill
                sizes="(max-width: 640px) 164px, 180px"
                className="object-contain object-left drop-shadow-[0_0_12px_rgba(179,3,47,0.3)]"
                priority
              />
              <span aria-hidden="true" className="logo-flare" />
            </Link>
          </div>

          <nav className="ml-10 hidden items-center gap-8 lg:flex">
            <Link
              href="/categories"
              className={`eyebrow transition-colors ${isActive("/categories") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
            >
              Categories
            </Link>
            <Link
              href="/products"
              className={`eyebrow transition-colors ${isActive("/products") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
            >
              Products
            </Link>
            {navSale ? (
              <Link
                href={`/sale/${navSale.slug}`}
                className={`eyebrow transition-colors ${isActive("/sale") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
              >
                {navSale.title}
              </Link>
            ) : null}
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/25 text-foreground backdrop-blur-md transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <div className="hidden items-center gap-3 sm:gap-4 lg:flex">
              <Link
                href="/search"
                className="text-foreground/85 transition-colors hover:text-primary"
                aria-label="Search"
              >
                <Search size={16} />
              </Link>
              <Link
                href="/cart"
                className={`relative text-foreground/85 transition-colors hover:text-primary ${isActive("/cart") ? "text-primary" : ""}`}
                aria-label="Cart"
              >
                <ShoppingCart size={16} />
                {itemCount > 0 && (
                  <span className="tabular absolute -right-2.5 -top-2.5 text-[10px] font-semibold leading-none text-primary">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>

              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="text-foreground/85 transition-colors hover:text-primary"
                    aria-label="Account"
                  >
                    <User size={16} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-card/95 py-2 shadow-2xl shadow-black/30"
                      >
                        <Link
                          href="/account/orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-card-hover"
                        >
                          <Package size={16} />
                          My Orders
                        </Link>
                        <Link
                          href="/wishlist"
                          onClick={() => setUserMenuOpen(false)}
                          className="px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-card-hover block"
                        >
                          Wishlist
                        </Link>
                        <hr className="my-1 border-border" />
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger transition-colors hover:bg-card-hover"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-foreground/85 transition-colors hover:text-primary"
                  aria-label="Login"
                >
                  <User size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rendered on <body> so the header's backdrop-filter does not become the
          containing block for these fixed-position elements. */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-[2147483646] cursor-default bg-black/30 lg:hidden"
              />
              <motion.aside
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="fixed right-0 top-0 z-[2147483647] flex max-h-dvh w-[68vw] max-w-[17.5rem] flex-col overflow-y-auto bg-white/[0.02] backdrop-blur-[2px] backdrop-saturate-150 lg:hidden"
                aria-label="Mobile navigation"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_35%)]" />

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-white/[0.04] text-foreground/80 transition-colors hover:text-primary"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>

                <nav className="relative px-4 pb-3 pt-14">
                  <p className="eyebrow-xs mb-2 px-3 text-muted/70">
                    Browse
                  </p>
                  {[
                    { href: "/categories", label: "Categories" },
                    { href: "/products", label: "Products" },
                    ...(navSale ? [{ href: `/sale/${navSale.slug}`, label: navSale.title }] : []),
                    { href: "/wishlist", label: "Wishlist" },
                    { href: "/search", label: "Search" },
                    { href: "/cart", label: "Cart" },
                  ].map(({ href, label }) => {
                    const active = isActive(href);
                    const count = href === "/cart" && itemCount > 0 ? itemCount : null;

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex min-h-10 items-center px-3.5 transition-colors ${
                          active ? "text-primary" : "text-foreground/85 hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium leading-snug ${
                            active ? "border-b border-primary pb-1" : ""
                          }`}
                        >
                          {label}
                        </span>
                        {count && (
                          <span className="tabular ml-auto grid min-w-6 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </Link>
                    );
                  })}

                  {isAuthenticated && (
                    <div className="mt-3 border-t border-white/8 pt-3">
                      <p className="eyebrow-xs mb-2 px-3 text-muted/70">
                        Account
                      </p>
                      <Link
                        href="/account/orders"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex min-h-10 items-center px-3.5 transition-colors ${
                          isActive("/account")
                            ? "text-primary"
                            : "text-foreground/85 hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium leading-snug ${
                            isActive("/account") ? "border-b border-primary pb-1" : ""
                          }`}
                        >
                          My account
                        </span>
                      </Link>
                    </div>
                  )}
                </nav>

                <div className="relative shrink-0 p-3">
                  {!isAuthenticated ? (
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="btn-text flex h-10 items-center justify-center bg-white/[0.06] text-white backdrop-blur-[2px] backdrop-saturate-150 transition-colors hover:bg-white/[0.12]"
                    >
                      Login / register
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        void handleLogout();
                      }}
                      className="btn-text flex h-10 w-full items-center justify-center border border-danger/25 bg-danger/8 text-danger transition-colors hover:bg-danger/15"
                    >
                      Logout
                    </button>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </header>
  );
}
