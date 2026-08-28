import Link from "next/link";
import Image from "next/image";
import { theme } from "@/config/theme";


export default function Footer() {
  return (
    <footer className="border-t border-border/70 bg-black text-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 inline-flex items-center" aria-label={`${theme.brand.name} Home`}>
              <Image
                src="/logo.svg"
                alt={theme.brand.name}
                width={132}
                height={28}
                className="h-6 w-auto object-contain sm:h-7"
              />
            </Link>
          </div>

          <div>
            <h3 className="label-text mb-4 text-foreground">Quick Links</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/products" className="text-sm transition-colors hover:text-primary">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-sm transition-colors hover:text-primary">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/products?featured=true" className="text-sm transition-colors hover:text-primary">
                  Featured
                </Link>
              </li>
              <li>
                <Link href="/sale" className="text-sm transition-colors hover:text-primary">
                  Sales
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="label-text mb-4 text-foreground">Account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="text-sm transition-colors hover:text-primary">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="text-sm transition-colors hover:text-primary">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-sm transition-colors hover:text-primary">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="label-text mb-4 text-foreground">Support</h3>
            <ul className="space-y-2.5">
              <li className="text-sm">{theme.brand.supportEmail}</li>
              <li className="text-sm">{theme.brand.supportPhone}</li>
              <li className="text-sm">{theme.brand.supportHours}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted/70">
            &copy; {new Date().getFullYear()} {theme.brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
