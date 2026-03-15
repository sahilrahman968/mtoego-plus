import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSiteSettings } from "@/models/site-settings.model";

export const dynamic = "force-dynamic";

// ─── GET /api/site-settings — Public: fetch active site settings ────────────

export async function GET() {
  try {
    await connectDB();
    const settings = await getSiteSettings();

    // Only return active banner data to the storefront
    const heroBanner = settings.heroBanner.isActive && settings.heroBanner.url
      ? {
          type: settings.heroBanner.type,
          url: settings.heroBanner.url,
          alt: settings.heroBanner.alt,
          link: settings.heroBanner.link,
          headline: settings.heroBanner.headline,
          subheadline: settings.heroBanner.subheadline,
          ctaText: settings.heroBanner.ctaText,
          ctaLink: settings.heroBanner.ctaLink,
        }
      : null;

    const heroImage = settings.heroImage?.isActive && settings.heroImage?.url
      ? {
          url: settings.heroImage.url,
          alt: settings.heroImage.alt,
        }
      : null;

    return successResponse({ heroBanner, heroImage }, "Site settings retrieved");
  } catch (err) {
    console.error("GET /api/site-settings error:", err);
    return errorResponse("Failed to retrieve site settings", 500);
  }
}
