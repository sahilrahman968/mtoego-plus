import { createHash } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

// ─── Cloudinary Configuration ───────────────────────────────────────────────
// Configured once; the SDK caches this globally. Uploads use signed fetch
// (see uploadImage) because the SDK's Node https client times out under
// Next/Turbopack (~5s → 499 Request Timeout). Rename/delete still use the SDK.

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

function mimeTypeForUpload(mimeType?: string): string {
  if (
    mimeType &&
    (UPLOAD_CONFIG.allowedMimeTypes as readonly string[]).includes(mimeType)
  ) {
    return mimeType;
  }
  return "application/octet-stream";
}

/** Cloudinary signed-upload signature (SHA-1 of sorted params + api_secret). */
function signUploadParams(
  params: Record<string, string>,
  apiSecret: string
): string {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
}

function cloudinaryErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const root = payload as Record<string, unknown>;
  const nested = root.error;
  if (nested && typeof nested === "object" && "message" in nested) {
    const message = (nested as { message: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  if (typeof root.message === "string" && root.message) return root.message;
  return fallback;
}

/**
 * Upload a single image buffer to Cloudinary via signed REST upload.
 * Uses fetch instead of the SDK uploader — the SDK's https client stalls under
 * Next/Turbopack and returns 499 Request Timeout after ~5s.
 */
export async function uploadImage(
  buffer: Buffer,
  options?: {
    folder?: string;
    publicId?: string;
    overwrite?: boolean;
    mimeType?: string;
  }
): Promise<CloudinaryUploadResult> {
  const overwrite = options?.overwrite ?? false;
  const folder = options?.folder ?? resolveUploadFolder("products");
  const mime = mimeTypeForUpload(options?.mimeType);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signParams: Record<string, string> = {
    folder,
    timestamp,
  };
  if (options?.publicId) signParams.public_id = options.publicId;
  if (overwrite) {
    signParams.overwrite = "true";
    signParams.invalidate = "true";
  }

  const signature = signUploadParams(signParams, env.CLOUDINARY_API_SECRET);

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    "upload"
  );
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("signature", signature);
  for (const [key, value] of Object.entries(signParams)) {
    form.append(key, value);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, { method: "POST", body: form });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      cloudinaryErrorMessage(payload, `Cloudinary upload failed (${response.status})`)
    );
  }

  const result = payload as {
    secure_url: string;
    public_id: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  };

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
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
export async function deleteProductImageFolder(
  productSlug: string
): Promise<void> {
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
