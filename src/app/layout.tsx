import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { ToastProvider } from "@/components/jewellery/shared/Toast";
import { theme, getThemeCSSVariables } from "@/config/theme";

// ── Font imports ─────────────────────────────────────────────────────────────
// To change fonts: swap the imports below AND update fonts.body / fonts.display
// in src/config/theme.ts so the variable names stay in sync.
//
// Both are variable fonts, so the whole weight range ships in a single file
// instead of one request per static weight.

const bodyFont = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Cormorant_Garamond({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

// ── Metadata (reads from theme config) ───────────────────────────────────────

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: `${theme.brand.name} - ${theme.brand.tagline}`,
    template: `%s | ${theme.brand.name}`,
  },
  description: theme.brand.description,
  keywords: [...theme.brand.keywords],
  openGraph: {
    type: "website",
    siteName: theme.brand.name,
    title: `${theme.brand.name} — ${theme.brand.tagline}`,
    description: theme.brand.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${theme.brand.name} — ${theme.brand.tagline}`,
    description: theme.brand.description,
  },
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
    <html lang="en-IN">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} antialiased`}
        style={themeVars as React.CSSProperties}
      >
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
