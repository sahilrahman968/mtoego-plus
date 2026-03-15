import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import { uploadImage, UPLOAD_CONFIG, CloudinaryUploadResult } from "@/lib/cloudinary";

// ─── POST /api/admin/upload — Upload images to Cloudinary ───────────────────
// Admin-only. Accepts multipart/form-data with one or more "files" fields.

export async function POST(request: NextRequest) {
  try {
    // ── Auth: admin only ────────────────────────────────────────────────
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    // ── Parse multipart form data ───────────────────────────────────────
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return errorResponse("No files provided", 400);
    }

    if (files.length > 10) {
      return errorResponse("Maximum 10 files per upload", 400);
    }

    // ── Validate and upload each file ───────────────────────────────────
    const results: CloudinaryUploadResult[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!(file instanceof File)) {
        errors.push(`Item ${i}: Not a valid file`);
        continue;
      }

      // Validate MIME type
      if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type as typeof UPLOAD_CONFIG.allowedMimeTypes[number])) {
        errors.push(
          `"${file.name}": Invalid file type "${file.type}". Allowed: ${UPLOAD_CONFIG.allowedMimeTypes.join(", ")}`
        );
        continue;
      }

      // Validate file size
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        const maxMB = UPLOAD_CONFIG.maxFileSize / (1024 * 1024);
        errors.push(
          `"${file.name}": File too large (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max: ${maxMB} MB`
        );
        continue;
      }

      // Convert to buffer and upload
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const result = await uploadImage(buffer);
        results.push(result);
      } catch (uploadErr) {
        const msg = uploadErr instanceof Error ? uploadErr.message : "Unknown upload error";
        errors.push(`"${file.name}": Upload failed — ${msg}`);
      }
    }

    // ── Response ────────────────────────────────────────────────────────
    if (results.length === 0) {
      return errorResponse("All uploads failed", 400, errors.join("; "));
    }

    return successResponse(
      { uploaded: results, errors: errors.length > 0 ? errors : undefined },
      `${results.length} of ${files.length} file(s) uploaded successfully`,
      errors.length > 0 ? 207 : 201 // 207 Multi-Status if partial success
    );
  } catch (err) {
    console.error("[Upload] Error:", err);
    return errorResponse("Upload failed", 500);
  }
}
