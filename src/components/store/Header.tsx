"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  Heart,
  Search,
  User,
  Menu,
  X,
  LogOut,
  Package,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { theme } from "@/config/theme";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-border">
        {/* Top bar */}
        {theme.announcement.enabled && (
          <div
            className="bg-primary text-white text-xs text-center py-1.5 px-4"
            dangerouslySetInnerHTML={{ __html: theme.announcement.text }}
          />
        )}

        {/* Main header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -ml-2 text-foreground hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{theme.brand.name.charAt(0)}</span>
              </div>
              <span className="text-xl font-bold text-foreground hidden sm:block">
                {theme.brand.name}
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8 ml-10">
              <Link
                href="/"
                className={`nav-link text-sm font-medium transition-colors ${isActive("/") ? "nav-active" : "text-foreground hover:text-primary"}`}
              >
                Home
              </Link>
              <Link
                href="/products"
                className={`nav-link text-sm font-medium transition-colors ${isActive("/products") ? "nav-active" : "text-foreground hover:text-primary"}`}
              >
                Products
              </Link>
              <Link
                href="/categories"
                className={`nav-link text-sm font-medium transition-colors ${isActive("/categories") ? "nav-active" : "text-foreground hover:text-primary"}`}
              >
                Categories
              </Link>
            </nav>

            {/* Desktop Search */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-md mx-8"
            >
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
                aria-label="Search"
              >
                <Search size={20} />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className={`icon-hover-fill p-2 transition-colors ${isActive("/wishlist") ? "text-primary icon-active" : "text-foreground hover:text-primary"}`}
                aria-label="Wishlist"
              >
                <Heart size={20} />
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className={`icon-hover-fill p-2 transition-colors relative ${isActive("/cart") ? "text-primary icon-active" : "text-foreground hover:text-primary"}`}
                aria-label="Cart"
              >
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce-gentle">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </Link>

              {/* User menu */}
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="avatar-btn flex items-center gap-1.5 p-1 rounded-full"
                  >
                    {user?.picture ? (
                      <Image
                        src={user.picture}
                        alt={user.name || "User"}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-primary text-white text-xs font-semibold flex items-center justify-center">
                        {getInitials(user?.name)}
                      </span>
                    )}
                    <ChevronDown size={14} className="hidden sm:block text-foreground" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-border py-2 animate-slide-down z-50">
                      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
                        {user?.picture ? (
                          <Image
                            src={user.picture}
                            alt={user.name || "User"}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="w-9 h-9 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center shrink-0">
                            {getInitials(user?.name)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user?.name}
                          </p>
                          <p className="text-xs text-muted truncate">{user?.email}</p>
                        </div>
                      </div>
                      <Link
                        href="/account/orders"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                      >
                        <Package size={16} />
                        My Orders
                      </Link>
                      <Link
                        href="/wishlist"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-gray-50 transition-colors"
                      >
                        <Heart size={16} />
                        Wishlist
                      </Link>
                      <hr className="my-1 border-border" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-gray-50 w-full transition-colors"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-full transition-all duration-300 hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95"
                >
                  <User size={16} />
                  Login
                </Link>
              )}
              {!isAuthenticated && (
                <Link
                  href="/login"
                  className="sm:hidden p-2 text-foreground hover:text-primary transition-colors"
                  aria-label="Login"
                >
                  <User size={20} />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden border-t border-border px-4 py-3 animate-slide-down">
            <form onSubmit={handleSearch} className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </form>
          </div>
        )}

        {/* Mobile navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-white animate-slide-down">
            <nav className="px-4 py-4 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive("/") ? "text-primary bg-primary-light" : "text-foreground hover:bg-gray-50"}`}
              >
                Home
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive("/products") ? "text-primary bg-primary-light" : "text-foreground hover:bg-gray-50"}`}
              >
                Products
              </Link>
              <Link
                href="/categories"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive("/categories") ? "text-primary bg-primary-light" : "text-foreground hover:bg-gray-50"}`}
              >
                Categories
              </Link>
              {!isAuthenticated && (
                <>
                  <hr className="border-border" />
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary-light rounded-lg transition-colors"
                  >
                    Login / Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
