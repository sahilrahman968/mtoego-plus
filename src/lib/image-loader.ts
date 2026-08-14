import type { ImageLoaderProps } from "next/image";

// ─── Custom next/image Loader ───────────────────────────────────────────────
// Cloudinary assets are resized and delivered by Cloudinary itself.
//
// Beyond saving a round trip, this avoids a hard failure: Next refuses to proxy
// an upstream host that resolves to a non-unicast IP, so /_next/image returns
// 400 whenever DNS hands back res.cloudinary.com behind a NAT64 prefix.
//
// Everything else is returned untouched. Configuring a custom loader unmounts
// the built-in /_next/image endpoint, so pointing any src at it would 404 —
// local files (logo, placeholder) and other remote hosts must be served as-is.

const CLOUDINARY_HOST = "https://res.cloudinary.com/";
const UPLOAD_SEGMENT = "/image/upload/";

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  const uploadIndex = src.indexOf(UPLOAD_SEGMENT);

  if (src.startsWith(CLOUDINARY_HOST) && uploadIndex !== -1) {
    const splitAt = uploadIndex + UPLOAD_SEGMENT.length;
    const transformations = [
      "f_auto",
      `q_${quality ?? "auto"}`,
      `w_${width}`,
      "c_limit", // never upscale beyond the original
    ].join(",");
    return `${src.slice(0, splitAt)}${transformations}/${src.slice(splitAt)}`;
  }

  return src;
}
