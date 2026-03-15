// ─── Global Theme Configuration ─────────────────────────────────────────────
// This is the single source of truth for the website's visual identity.
// Change values here and they propagate across the entire site.
//
// FONTS: Body & display fonts are imported via next/font/google in layout.tsx.
//        To swap fonts, update the imports there AND the font variable names below.

export const theme = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand: {
    name: "Motoego+",
    tagline: "Your One-Stop Online Store",
    description:
      "Discover amazing products at the best prices. Free shipping on orders above ₹999. Shop now for quality products with secure checkout.",
    keywords: ["ecommerce", "online shopping", "buy online", "best prices", "free shipping"],
    supportEmail: "help@shopnow.in",
    supportPhone: "+91 98765 43210",
    supportHours: "Mon - Sat, 9am - 6pm",
  },

  // ── Colors ─────────────────────────────────────────────────────────────────
  // These map directly to CSS custom properties (--background, --primary, etc.)
  // and are available as Tailwind utilities (bg-primary, text-muted, etc.)
  colors: {
    background: "#ffffff",
    foreground: "#111827",
    primary: "#111827",
    primaryDark: "#000000",
    primaryLight: "#F3F4F6",
    accent: "#4B5563",
    accentLight: "#F9FAFB",
    muted: "#6B7280",
    border: "#E5E7EB",
    card: "#FFFFFF",
    cardHover: "#F9FAFB",
    danger: "#1F2937",
    warning: "#6B7280",
    success: "#374151",
  },

  // ── Fonts ──────────────────────────────────────────────────────────────────
  // CSS variable names set by next/font/google in layout.tsx.
  // sans  = body text    (currently Barlow)
  // display = headings   (currently Bebas Neue)
  fonts: {
    sans: "var(--font-barlow)",
    display: "var(--font-bebas)",
  },

  // ── Headings ───────────────────────────────────────────────────────────────
  headings: {
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },

  // ── Announcement Bar ───────────────────────────────────────────────────────
  announcement: {
    enabled: true,
    text: 'Free shipping on orders above ₹999 | Use code <strong>WELCOME10</strong> for 10% off',
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Converts the camelCase color keys to kebab-case CSS custom property names */
function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/** Generates an inline style object that sets CSS custom properties from the theme */
export function getThemeCSSVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--${camelToKebab(key)}`] = value;
  }
  return vars;
}

export type Theme = typeof theme;
