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

// ─── MSG91 (Indian numbers) ────────────────────────────────────────────────

async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    throw new Error("Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID");
  }

  const mobile = phone.replace("+", "");

  const res = await fetch("https://control.msg91.com/api/v5/otp", {
    method: "POST",
    headers: {
      authkey: authKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      template_id: templateId,
      mobile,
      otp,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MSG91 API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (data.type === "error") {
    throw new Error(`MSG91 error: ${data.message}`);
  }
}

// ─── Twilio (international numbers) ────────────────────────────────────────

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }
  return twilio(accountSid, authToken);
}

async function sendViaTwilio(phone: string, otp: string): Promise<void> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    throw new Error("Missing TWILIO_PHONE_NUMBER");
  }

  await client.messages.create({
    body: `Your Motoego+ verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes. Do not share this code.`,
    from,
    to: phone,
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  const hasProviders =
    process.env.MSG91_AUTH_KEY ||
    process.env.TWILIO_ACCOUNT_SID;

  if (process.env.NODE_ENV !== "production" && !hasProviders) {
    console.log(`\n[SMS OTP] ${phone} → ${otp}\n`);
    return;
  }

  if (isIndianPhone(phone)) {
    await sendViaMSG91(phone, otp);
  } else {
    await sendViaTwilio(phone, otp);
  }
}
