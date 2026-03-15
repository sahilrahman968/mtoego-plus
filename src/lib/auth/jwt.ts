import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { JWTPayload } from "@/types";

// ─── JWT Utilities ──────────────────────────────────────────────────────────
// We use the `jose` library instead of `jsonwebtoken` because jose is
// Edge‑runtime compatible (needed by Next.js middleware which runs on Edge).

function getSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

/** Parse a duration string like "7d", "24h", "60m" into seconds. */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    d: 86400,
    h: 3600,
    m: 60,
    s: 1,
  };
  return value * (multipliers[unit] ?? 86400);
}

/** Create a signed JWT for the given payload. */
export async function signToken(payload: JWTPayload): Promise<string> {
  const expiresIn = parseDuration(env.JWT_EXPIRES_IN);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresIn)
    .sign(getSecret());
}

/** Verify and decode a JWT. Returns the payload or `null` on failure. */
export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
