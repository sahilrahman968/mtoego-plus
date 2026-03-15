// ─── Environment Variable Accessor ──────────────────────────────────────────
// Centralised access with runtime validation so missing vars surface early.

function getEnvVar(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  get MONGODB_URI() {
    return getEnvVar("MONGODB_URI");
  },
  get JWT_SECRET() {
    return getEnvVar("JWT_SECRET");
  },
  get JWT_EXPIRES_IN() {
    return process.env.JWT_EXPIRES_IN ?? "7d";
  },
  get NODE_ENV() {
    return (process.env.NODE_ENV ?? "development") as
      | "development"
      | "production"
      | "test";
  },
  get IS_PRODUCTION() {
    return this.NODE_ENV === "production";
  },

  // ─── Cloudinary ─────────────────────────────────────────────────────────
  get CLOUDINARY_CLOUD_NAME() {
    return getEnvVar("CLOUDINARY_CLOUD_NAME");
  },
  get CLOUDINARY_API_KEY() {
    return getEnvVar("CLOUDINARY_API_KEY");
  },
  get CLOUDINARY_API_SECRET() {
    return getEnvVar("CLOUDINARY_API_SECRET");
  },

  // ─── Google OAuth (optional — only needed if Google sign‑in is enabled) ──
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },

  // ─── Razorpay ───────────────────────────────────────────────────────────
  get RAZORPAY_KEY_ID() {
    return getEnvVar("RAZORPAY_KEY_ID");
  },
  get RAZORPAY_KEY_SECRET() {
    return getEnvVar("RAZORPAY_KEY_SECRET");
  },
  get RAZORPAY_WEBHOOK_SECRET() {
    return getEnvVar("RAZORPAY_WEBHOOK_SECRET");
  },
};
