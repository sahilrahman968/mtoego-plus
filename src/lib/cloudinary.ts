import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

// ─── Cloudinary Configuration ───────────────────────────────────────────────
// Configured once; the SDK caches this globally.

let configured = false;

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

// ─── Upload Options ─────────────────────────────────────────────────────────

export const UPLOAD_CONFIG = {
  folder: "ecom/products",
  allowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ],
  transformation: [
    { quality: "auto", fetch_format: "auto" }, // auto-optimize for web
  ],
} as const;

// ─── Upload Helper ──────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a single image buffer to Cloudinary using signed upload.
 */
export async function uploadImage(
  buffer: Buffer,
  options?: { folder?: string; publicId?: string }
): Promise<CloudinaryUploadResult> {
  const cld = getCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: options?.folder ?? UPLOAD_CONFIG.folder,
        public_id: options?.publicId,
        resource_type: "image",
        type: "upload",            // signed upload
        overwrite: false,
        transformation: UPLOAD_CONFIG.transformation,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error ?? new Error("Upload failed"));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

// ─── Delete Helper ──────────────────────────────────────────────────────────

/**
 * Delete a single image from Cloudinary by public ID.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  const cld = getCloudinary();
  const result = await cld.uploader.destroy(publicId, {
    resource_type: "image",
  });
  return result.result === "ok";
}

/**
 * Delete multiple images from Cloudinary by public IDs.
 */
export async function deleteImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;
  const cld = getCloudinary();
  await cld.api.delete_resources(publicIds, {
    resource_type: "image",
  });
}
