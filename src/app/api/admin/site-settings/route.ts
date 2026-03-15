import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { getSiteSettings } from "@/models/site-settings.model";

// ─── GET /api/admin/site-settings ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    await connectDB();
    const settings = await getSiteSettings();

    return successResponse(settings, "Site settings retrieved");
  } catch (err) {
    console.error("GET /api/admin/site-settings error:", err);
    return errorResponse("Failed to retrieve site settings", 500);
  }
}

// ─── PUT /api/admin/site-settings ────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const body = await request.json();

    await connectDB();
    const settings = await getSiteSettings();

    // Update hero banner fields
    if (body.heroBanner) {
      const hb = body.heroBanner;
      if (hb.type !== undefined) settings.heroBanner.type = hb.type;
      if (hb.url !== undefined) settings.heroBanner.url = hb.url;
      if (hb.publicId !== undefined) settings.heroBanner.publicId = hb.publicId;
      if (hb.alt !== undefined) settings.heroBanner.alt = hb.alt;
      if (hb.link !== undefined) settings.heroBanner.link = hb.link;
      if (hb.headline !== undefined) settings.heroBanner.headline = hb.headline;
      if (hb.subheadline !== undefined) settings.heroBanner.subheadline = hb.subheadline;
      if (hb.ctaText !== undefined) settings.heroBanner.ctaText = hb.ctaText;
      if (hb.ctaLink !== undefined) settings.heroBanner.ctaLink = hb.ctaLink;
      if (hb.isActive !== undefined) settings.heroBanner.isActive = hb.isActive;
    }

    // Update hero image fields
    if (body.heroImage) {
      const hi = body.heroImage;
      const current = settings.heroImage ?? { url: "", publicId: "", alt: "", isActive: false };
      settings.set("heroImage", {
        url: hi.url !== undefined ? hi.url : current.url,
        publicId: hi.publicId !== undefined ? hi.publicId : current.publicId,
        alt: hi.alt !== undefined ? hi.alt : current.alt,
        isActive: hi.isActive !== undefined ? hi.isActive : current.isActive,
      });
    }

    await settings.save();

    return successResponse(settings, "Site settings updated");
  } catch (err) {
    console.error("PUT /api/admin/site-settings error:", err);
    return errorResponse("Failed to update site settings", 500);
  }
}
