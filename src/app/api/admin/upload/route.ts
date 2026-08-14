import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { successResponse, errorResponse } from "@/lib/api-response";
import {
  uploadImage,
  deleteImage,
  renameImage,
  resolveUploadFolder,
  sanitizePublicId,
  UPLOAD_CONFIG,
  CloudinaryUploadResult,
} from "@/lib/cloudinary";

// ─── POST /api/admin/upload — Upload images to Cloudinary ───────────────────
// Admin-only. Accepts multipart/form-data with one or more "files" fields,
// plus optional folder/publicId fields. Product uploads also include productSlug
// and startIndex so their names are stable across multiple upload batches.

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

    // ── Destination folder and naming ───────────────────────────────────
    const folderField = formData.get("folder");
    const folderKey = typeof folderField === "string" ? folderField : null;
    const productSlugField = formData.get("productSlug");
    const productSlug =
      typeof productSlugField === "string"
        ? sanitizePublicId(productSlugField)
        : "";

    if (folderKey === "products" && !productSlug) {
      return errorResponse("A valid product slug is required", 400);
    }

    const folder = resolveUploadFolder(folderKey, productSlug);

    const publicIdField = formData.get("publicId");
    const basePublicId = folderKey === "products"
      ? productSlug
      : typeof publicIdField === "string"
        ? sanitizePublicId(publicIdField)
        : "";

    if (typeof publicIdField === "string" && publicIdField && !basePublicId) {
      return errorResponse("Invalid image name", 400);
    }

    const startIndexField = formData.get("startIndex");
    const startIndex =
      typeof startIndexField === "string" ? Number(startIndexField) : 1;
    if (
      folderKey === "products" &&
      (
        !Number.isInteger(startIndex) ||
        startIndex < 1 ||
        startIndex + files.length - 1 > 10
      )
    ) {
      return errorResponse("Invalid product image start index", 400);
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
        const publicId = folderKey === "products"
          ? `${basePublicId}-${startIndex + i}`
          : basePublicId
            ? files.length > 1
              ? `${basePublicId}-${i + 1}`
              : basePublicId
            : undefined;
        const result = await uploadImage(buffer, {
          folder,
          publicId,
          overwrite: !!publicId,
        });
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

// ─── PATCH /api/admin/upload — Rename an image to match a new name ──────────
// Admin-only. Body: { "publicId": "...", "folder": "categories", "name": "slug" }

export async function PATCH(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const publicId =
      body && typeof body.publicId === "string" ? body.publicId.trim() : "";
    const name = body && typeof body.name === "string" ? body.name : "";

    if (!publicId || !name) {
      return errorResponse("publicId and name are required", 400);
    }

    const sanitized = sanitizePublicId(name);
    if (!sanitized) {
      return errorResponse("Invalid image name", 400);
    }

    const folder = resolveUploadFolder(
      body && typeof body.folder === "string" ? body.folder : null
    );
    const target = `${folder}/${sanitized}`;

    if (target === publicId) {
      return successResponse(
        { publicId, renamed: false },
        "Image name is already up to date"
      );
    }

    const renamed = await renameImage(publicId, target);
    return successResponse({ ...renamed, renamed: true }, "Image renamed successfully");
  } catch (err) {
    console.error("[Upload] Rename error:", err);
    return errorResponse("Failed to rename image", 500);
  }
}

// ─── DELETE /api/admin/upload — Remove an image from Cloudinary ─────────────
// Admin-only. Body: { "publicId": "motoego-dev/categories/my-slug" }

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireAuth(request, ["super_admin", "staff"]);
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => null);
    const publicId =
      body && typeof body.publicId === "string" ? body.publicId.trim() : "";

    if (!publicId) {
      return errorResponse("publicId is required", 400);
    }

    const deleted = await deleteImage(publicId);
    if (!deleted) {
      return errorResponse("Image not found or already deleted", 404);
    }

    return successResponse({ publicId }, "Image deleted successfully");
  } catch (err) {
    console.error("[Upload] Delete error:", err);
    return errorResponse("Failed to delete image", 500);
  }
}
