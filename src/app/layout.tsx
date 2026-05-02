import type { Metadata } from "next";
import { Barlow_Condensed, Teko } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/store/Toast";
import { theme, getThemeCSSVariables } from "@/config/theme";

// ── Font imports ─────────────────────────────────────────────────────────────
// To change fonts: swap the imports below AND update fonts.sans / fonts.display
// in src/config/theme.ts so the variable names stay in sync.

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const bebasNeue = Teko({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// ── Metadata (reads from theme config) ───────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: `${theme.brand.name} - ${theme.brand.tagline}`,
    template: `%s | ${theme.brand.name}`,
  },
  description: theme.brand.description,
  keywords: theme.brand.keywords,
};

// ── Theme CSS variables ──────────────────────────────────────────────────────

const themeVars: Record<string, string> = {
  ...getThemeCSSVariables(),
  "--heading-letter-spacing": theme.headings.letterSpacing,
  "--heading-text-transform": theme.headings.textTransform,
};

// ── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${barlow.variable} ${bebasNeue.variable} antialiased`}
        style={themeVars as React.CSSProperties}
      >
        <AuthProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
