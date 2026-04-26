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

  // ─── SMTP (for transactional emails like verification) ─────────────────
  get SMTP_HOST() {
    return getEnvVar("SMTP_HOST");
  },
  get SMTP_PORT() {
    return parseInt(process.env.SMTP_PORT ?? "587", 10);
  },
  get SMTP_USER() {
    return getEnvVar("SMTP_USER");
  },
  get SMTP_PASS() {
    return getEnvVar("SMTP_PASS");
  },
  get SMTP_FROM() {
    return process.env.SMTP_FROM ?? `Motoego+ <${process.env.SMTP_USER}>`;
  },
  get APP_URL() {
    return process.env.APP_URL ?? "http://localhost:3000";
  },

  // ─── Google OAuth (optional — only needed if Google sign‑in is enabled) ──
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID ?? "";
  },

  // ─── MSG91 SMS (for Indian OTP verification) ──────────────────────────────
  get MSG91_AUTH_KEY() {
    return process.env.MSG91_AUTH_KEY ?? "";
  },
  get MSG91_TEMPLATE_ID() {
    return process.env.MSG91_TEMPLATE_ID ?? "";
  },

  // ─── Twilio SMS (for international OTP verification) ──────────────────────
  get TWILIO_ACCOUNT_SID() {
    return process.env.TWILIO_ACCOUNT_SID ?? "";
  },
  get TWILIO_AUTH_TOKEN() {
    return process.env.TWILIO_AUTH_TOKEN ?? "";
  },
  get TWILIO_PHONE_NUMBER() {
    return process.env.TWILIO_PHONE_NUMBER ?? "";
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
