import Link from "next/link";
import { Package, Truck, Shield, CreditCard } from "lucide-react";
import { theme } from "@/config/theme";

const features = [
  { icon: Truck, title: "Free Shipping", desc: "On orders above ₹999" },
  { icon: Shield, title: "Secure Payment", desc: "100% secure checkout" },
  { icon: Package, title: "Easy Returns", desc: "7-day return policy" },
  { icon: CreditCard, title: "Multiple Payment", desc: "UPI, Cards, Net Banking" },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Features bar */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <f.icon size={20} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{theme.brand.name.charAt(0)}</span>
              </div>
              <span className="text-lg font-bold text-white">{theme.brand.name}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              {theme.brand.tagline}. Shop with confidence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/products" className="text-sm hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-sm hover:text-white transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/products?featured=true" className="text-sm hover:text-white transition-colors">
                  Featured
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/login" className="text-sm hover:text-white transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm hover:text-white transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/account/orders" className="text-sm hover:text-white transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-sm hover:text-white transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2.5">
              <li className="text-sm">{theme.brand.supportEmail}</li>
              <li className="text-sm">{theme.brand.supportPhone}</li>
              <li className="text-sm">{theme.brand.supportHours}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-xs text-gray-500 text-center">
            &copy; {new Date().getFullYear()} {theme.brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
