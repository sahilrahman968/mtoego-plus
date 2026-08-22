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
  allowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
  maxPublicIdLength: 100,
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

// ─── Upload Folders ─────────────────────────────────────────────────────────
// Clients send a folder *key*, never a raw path, so uploads can't escape the
// folders we manage. Resolved at call time so the root follows NODE_ENV.

export type UploadFolderKey = "products" | "categories" | "sales";

export function resolveUploadFolder(
  key?: string | null,
  productSlug?: string | null
): string {
  switch (key) {
    case "categories":
      return `${env.CLOUDINARY_ROOT_FOLDER}/categories`;
    case "sales":
      return `${env.CLOUDINARY_ROOT_FOLDER}/sales`;
    case "products": {
      const safeSlug = productSlug ? sanitizePublicId(productSlug) : "";
      return safeSlug
        ? `${env.CLOUDINARY_ROOT_FOLDER}/products/${safeSlug}`
        : `${env.CLOUDINARY_ROOT_FOLDER}/products`;
    }
    default:
      return `${env.CLOUDINARY_ROOT_FOLDER}/products`;
  }
}

/**
 * Turn arbitrary text (e.g. a category slug) into a safe Cloudinary public ID.
 * Slashes are stripped so a caller can never place an asset outside its folder.
 */
export function sanitizePublicId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, UPLOAD_CONFIG.maxPublicIdLength);
}

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
  options?: { folder?: string; publicId?: string; overwrite?: boolean }
): Promise<CloudinaryUploadResult> {
  const cld = getCloudinary();
  // Without overwrite, Cloudinary silently returns the *existing* asset when
  // the public ID is taken — re-uploading a category image would be a no-op.
  const overwrite = options?.overwrite ?? false;

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder: options?.folder ?? resolveUploadFolder("products"),
        public_id: options?.publicId,
        resource_type: "image",
        type: "upload",            // signed upload
        overwrite,
        invalidate: overwrite,     // purge the CDN copy of the replaced asset
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

// ─── Rename Helper ──────────────────────────────────────────────────────────

/**
 * Move an existing asset to a new public ID, e.g. after a category slug change.
 */
export async function renameImage(
  fromPublicId: string,
  toPublicId: string
): Promise<{ url: string; publicId: string }> {
  const cld = getCloudinary();
  const result = await cld.uploader.rename(fromPublicId, toPublicId, {
    resource_type: "image",
    overwrite: true,
    invalidate: true,
  });
  return { url: result.secure_url, publicId: result.public_id };
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

/**
 * Delete every image in a product's slug folder, then remove the empty folder.
 * Prefix deletion also catches assets that were uploaded but never persisted.
 */
export async function deleteProductImageFolder(productSlug: string): Promise<void> {
  const safeSlug = sanitizePublicId(productSlug);
  if (!safeSlug) {
    throw new Error("Invalid product slug");
  }

  const cld = getCloudinary();
  const folder = resolveUploadFolder("products", safeSlug);
  let nextCursor: string | undefined;

  do {
    const result = await cld.api.delete_resources_by_prefix(`${folder}/`, {
      resource_type: "image",
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });
    nextCursor = result.next_cursor;
  } while (nextCursor);

  try {
    await cld.api.delete_folder(folder);
  } catch (error) {
    const status = (error as { http_code?: number }).http_code;
    if (status !== 404) throw error;
  }
}
