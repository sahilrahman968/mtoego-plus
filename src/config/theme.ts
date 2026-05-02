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
    background: "#07070A",
    foreground: "#F3F3F5",
    primary: "#E32D22",
    primaryDark: "#8F0226",
    primaryLight: "#2A1018",
    accent: "#E31245",
    accentLight: "#241117",
    muted: "#A8A0A6",
    border: "#2B2428",
    card: "#101014",
    cardHover: "#18181E",
    danger: "#E23A56",
    warning: "#D49A2A",
    success: "#57B97D",
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
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
  },

  // ── Announcement Bar ───────────────────────────────────────────────────────
  announcement: {
    enabled: false,
    text: 'Throttle into savings: free shipping above ₹999 | Use code <strong>WELCOME10</strong> for 10% off',
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
