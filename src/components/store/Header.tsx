"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Package, Search, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isHome = pathname === "/";

  return (
    <header
      className={`z-50 w-full ${isHome ? "absolute top-0 left-0 right-0 bg-transparent" : "sticky top-0 border-b border-border/80 bg-black/80 backdrop-blur-xl"}`}
    >
      <div className="relative">
        <div className="mx-auto flex h-[4.5rem] max-w-[92rem] items-center justify-between px-3 sm:px-4 lg:px-6">
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? "Close" : "Menu"}
            </button>

            <Link href="/" className="shrink-0" aria-label="Motoego Home">
              <Image
                src="/logo.svg"
                alt="Motoego"
                width={176}
                height={40}
                className="h-9 w-auto scale-[4.65] origin-left object-contain drop-shadow-[0_0_12px_rgba(179,3,47,0.3)] sm:h-10"
                priority
              />
            </Link>
          </div>

          <nav className="ml-10 hidden items-center gap-8 lg:flex">
            <Link
              href="/"
              className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors ${isActive("/") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
            >
              Home
            </Link>
            <Link
              href="/products"
              className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors ${isActive("/products") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
            >
              Products
            </Link>
            <Link
              href="/categories"
              className={`text-[11px] font-medium uppercase tracking-[0.24em] transition-colors ${isActive("/categories") ? "text-primary" : "text-foreground/85 hover:text-primary"}`}
            >
              Categories
            </Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-4">
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
                <span className="absolute -right-2.5 -top-2.5 text-[10px] font-semibold text-primary">
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

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden border-t border-border bg-card/95 lg:hidden"
            >
              <nav className="space-y-1 px-4 py-4">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-colors ${isActive("/") ? "bg-primary/15 text-primary" : "text-foreground hover:bg-card-hover"}`}
                >
                  Home
                </Link>
                <Link
                  href="/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-colors ${isActive("/products") ? "bg-primary/15 text-primary" : "text-foreground hover:bg-card-hover"}`}
                >
                  Products
                </Link>
                <Link
                  href="/categories"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] transition-colors ${isActive("/categories") ? "bg-primary/15 text-primary" : "text-foreground hover:bg-card-hover"}`}
                >
                  Categories
                </Link>
                <Link
                  href="/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover"
                >
                  Wishlist
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-card-hover"
                >
                  Cart{itemCount > 0 ? ` (${itemCount})` : ""}
                </Link>
                {!isAuthenticated && (
                  <>
                    <hr className="border-border" />
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-3 py-2.5 text-sm font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary/15"
                    >
                      Login / Register
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <>
                    <hr className="border-border" />
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        void handleLogout();
                      }}
                      className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-[0.08em] text-danger transition-colors hover:bg-card-hover"
                    >
                      Logout
                    </button>
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
