// ─── Global Theme Configuration ─────────────────────────────────────────────
// This is the single source of truth for the website's visual identity.
// Change values here and they propagate across the entire site.
//
// FONTS: Body & display fonts are imported via next/font/google in layout.tsx.
//        To swap fonts, update the imports there AND the font variable names below.

export const theme = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  brand: {
    name: "Aurelia",
    tagline: "Jewellery for the moments you keep",
    description:
      "Discover contemporary jewellery selected for everyday rituals, celebrations, and everything worth remembering.",
    keywords: ["jewellery", "fine jewellery", "contemporary jewellery", "rings", "necklaces"],
    supportEmail: "help@shopnow.in",
    supportPhone: "+91 98765 43210",
    supportHours: "Mon - Sat, 9am - 6pm",
  },

  // ── Colors ─────────────────────────────────────────────────────────────────
  // These map directly to CSS custom properties (--background, --primary, etc.)
  // and are available as Tailwind utilities (bg-primary, text-muted, etc.)
  colors: {
    background: "#FAF8F3",
    foreground: "#1C1917",
    primary: "#8A642D",
    primaryDark: "#62451E",
    primaryLight: "#EFE4D1",
    accent: "#A16207",
    accentLight: "#F7EEDC",
    muted: "#6F6A63",
    border: "#D8D0C4",
    card: "#FFFFFF",
    cardHover: "#F5F0E8",
    danger: "#B42318",
    warning: "#946200",
    success: "#327A57",
  },

  // ── Admin panel colors ─────────────────────────────────────────────────────
  // The storefront is dark; the admin panel is a light, low-chroma work surface.
  // It therefore gets its own scale instead of reusing the brand colors above.
  // Exposed as `--admin-*` custom properties and as Tailwind utilities
  // (bg-admin-surface, text-admin-muted, border-admin-line, …).
  adminColors: {
    canvas: "#F7F8FA", // page background behind cards
    surface: "#FFFFFF", // cards, sidebar, header, inputs
    subtle: "#F4F5F7", // table headers, icon chips, inert fills
    hover: "#EFF1F4", // row / nav hover
    line: "#E7E9EE", // hairline borders and dividers
    lineStrong: "#D6DAE1", // input borders, emphasized separators
    heading: "#16181D", // titles and key figures
    body: "#3D4350", // default text
    muted: "#6C7280", // secondary text
    faint: "#8B919C", // tertiary text, icons, placeholders
    primary: "#1A1D23", // primary action fill
    primaryHover: "#0B0D10",
    focus: "#A9B2C0", // focus rings
    success: "#1F7A55",
    successSoft: "#EDF7F2",
    successLine: "#C9E7D8",
    warning: "#8A6114",
    warningSoft: "#FDF6E8",
    warningLine: "#F0E1BB",
    danger: "#B32D1D",
    dangerSoft: "#FCF1EF",
    dangerLine: "#F2D2CC",
    info: "#2F5FA8",
    infoSoft: "#EFF4FC",
    infoLine: "#D3E0F5",
  },

  // ── Fonts ──────────────────────────────────────────────────────────────────
  // CSS variable names set by next/font/google in layout.tsx.
  // body    = body text  (currently Inter — neutral, high x-height, very legible)
  // display = headings   (currently Space Grotesk — technical grotesk with
  //           enough character for uppercase headings without going condensed)
  fonts: {
    body: "var(--font-body)",
    display: "var(--font-display-face)",
  },

  // ── Headings ───────────────────────────────────────────────────────────────
  // Base tracking for uppercase headings. Optical sizing in globals.css tightens
  // this further as headings get larger — big type needs less letter spacing.
  headings: {
    letterSpacing: "-0.015em",
    textTransform: "none" as const,
  },

  // ── Announcement Bar ───────────────────────────────────────────────────────
  announcement: {
    enabled: true,
    text: "Complimentary shipping on orders above ₹999",
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
  for (const [key, value] of Object.entries(theme.adminColors)) {
    vars[`--admin-${camelToKebab(key)}`] = value;
  }
  return vars;
}

export type Theme = typeof theme;
