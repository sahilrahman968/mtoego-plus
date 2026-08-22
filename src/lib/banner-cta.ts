export const BANNER_CTA_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type BannerCtaPosition = (typeof BANNER_CTA_POSITIONS)[number];

const POSITION_ALIGN: Record<BannerCtaPosition, string> = {
  "top-left": "items-start justify-start",
  "top-center": "items-start justify-center",
  "top-right": "items-start justify-end",
  "center-left": "items-center justify-start",
  center: "items-center justify-center",
  "center-right": "items-center justify-end",
  "bottom-left": "items-end justify-start",
  "bottom-center": "items-end justify-center",
  "bottom-right": "items-end justify-end",
};

export function isBannerCtaPosition(value: unknown): value is BannerCtaPosition {
  return (
    typeof value === "string" &&
    (BANNER_CTA_POSITIONS as readonly string[]).includes(value)
  );
}

export function bannerCtaPositionClass(
  position: BannerCtaPosition = "bottom-left",
  compact = false
) {
  const inset = compact
    ? "px-5 py-7 sm:px-8 sm:py-9"
    : "px-3 py-14 sm:px-4 sm:py-20 lg:px-6 lg:py-24";
  return `absolute inset-0 z-[1] flex ${POSITION_ALIGN[position]} ${inset}`;
}
