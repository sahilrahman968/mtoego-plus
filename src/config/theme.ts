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

  // ── Admin panel colors ─────────────────────────────────────────────────────
  // Independent indigo / slate scale for the light admin work surface.
  // Never reuse storefront brand colors here — they are tuned for a dark page.
  // Applied only under `.admin-theme` / `html.admin-panel` (see getAdminThemeCSSVariables)
  // and exposed as Tailwind utilities (bg-admin-surface, text-admin-muted, …).
  adminColors: {
    canvas: "#F8FAFC", // cool gray page background
    surface: "#FFFFFF", // cards, sidebar, header, inputs
    subtle: "#F1F5F9", // table headers, icon chips, inert fills
    hover: "#F1F5F9", // cool gray row / nav hover
    line: "#E2E8F0", // hairline borders and dividers
    lineStrong: "#CBD5E1", // input borders, emphasized separators
    heading: "#0F172A", // main text / titles
    body: "#334155", // default body copy
    muted: "#64748B", // secondary text
    faint: "#94A3B8", // muted text, icons, placeholders
    primary: "#4F46E5", // indigo primary action
    primaryHover: "#4338CA",
    primarySoft: "#EEF2FF", // soft indigo fills / selected states
    focus: "#A5B4FC", // indigo focus rings
    success: "#10B981",
    successSoft: "#ECFDF5",
    successLine: "#A7F3D0",
    warning: "#F59E0B",
    warningSoft: "#FFFBEB",
    warningLine: "#FDE68A",
    danger: "#EF4444",
    dangerSoft: "#FEF2F2",
    dangerLine: "#FECACA",
    info: "#3B82F6",
    infoSoft: "#EFF6FF",
    infoLine: "#BFDBFE",
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
    letterSpacing: "0.015em",
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

/** Storefront CSS variables only — admin tokens must not land on the store body. */
export function getThemeCSSVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--${camelToKebab(key)}`] = value;
  }
  return vars;
}

/** Admin CSS variables — apply on `.admin-theme` / `html.admin-panel` only. */
export function getAdminThemeCSSVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.adminColors)) {
    vars[`--admin-${camelToKebab(key)}`] = value;
  }
  return vars;
}

export type Theme = typeof theme;
