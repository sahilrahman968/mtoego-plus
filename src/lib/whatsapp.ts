import crypto from "crypto";
import twilio from "twilio";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;

export function generateOtp(): { otp: string; hash: string; expiresAt: Date } {
  const otp = crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();
  const hash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return { otp, hash, expiresAt };
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const candidate = crypto.createHash("sha256").update(otp).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
}

export function isIndianPhone(phone: string): boolean {
  return phone.startsWith("+91");
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }
  return twilio(accountSid, authToken);
}

function toWhatsAppAddress(phone: string): string {
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
}

function getWhatsAppFrom(): string {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new Error("Missing TWILIO_WHATSAPP_FROM");
  }
  return toWhatsAppAddress(from);
}

async function sendViaTemplate(phone: string, otp: string): Promise<void> {
  const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
  if (!contentSid) {
    throw new Error("Missing TWILIO_WHATSAPP_CONTENT_SID");
  }

  const client = getTwilioClient();
  await client.messages.create({
    from: getWhatsAppFrom(),
    to: toWhatsAppAddress(phone),
    contentSid,
    contentVariables: JSON.stringify({ "1": otp }),
  });
}

async function sendViaSandboxBody(phone: string, otp: string): Promise<void> {
  const client = getTwilioClient();
  await client.messages.create({
    from: getWhatsAppFrom(),
    to: toWhatsAppAddress(phone),
    body: `Your Motoego+ verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
  });
}

export async function sendOtpWhatsApp(phone: string, otp: string): Promise<void> {
  const hasCredentials =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM;

  if (process.env.NODE_ENV !== "production" && !hasCredentials) {
    console.log(`\n[WhatsApp OTP] ${phone} → ${otp}\n`);
    return;
  }

  if (process.env.NODE_ENV === "production") {
    await sendViaTemplate(phone, otp);
    return;
  }

  await sendViaSandboxBody(phone, otp);
}
