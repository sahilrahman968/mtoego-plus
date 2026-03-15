import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "@/lib/env";

// ─── Razorpay Client (Singleton) ────────────────────────────────────────────
// Lazy‑initialised to avoid constructing before env vars are available.

let _instance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  if (!_instance) {
    _instance = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }
  return _instance;
}

// ─── Signature Verification ──────────────────────────────────────────────────
// Used after the client‑side Razorpay checkout returns a payment.
// See: https://razorpay.com/docs/payments/server-integration/nodejs/payment-verification/

/**
 * Verify the payment signature returned by Razorpay Checkout.
 *
 * @param razorpayOrderId   - The order_id from Razorpay
 * @param razorpayPaymentId - The payment_id returned by Checkout
 * @param razorpaySignature - The signature returned by Checkout
 * @returns `true` if the signature is valid
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  // Timing‑safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(razorpaySignature, "hex")
    );
  } catch {
    // If lengths don't match, timingSafeEqual throws — treat as invalid
    return false;
  }
}

// ─── Webhook Signature Verification ──────────────────────────────────────────
// See: https://razorpay.com/docs/webhooks/validate-test/

/**
 * Verify the webhook signature from Razorpay.
 *
 * @param rawBody        - The raw request body as a string
 * @param webhookSignature - The `X-Razorpay-Signature` header value
 * @returns `true` if the webhook signature is valid
 */
export function verifyWebhookSignature(
  rawBody: string,
  webhookSignature: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(webhookSignature, "hex")
    );
  } catch {
    return false;
  }
}
