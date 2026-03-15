import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

// ─── Cookie Helpers ─────────────────────────────────────────────────────────

const TOKEN_COOKIE_NAME = "token";

/** Cookie options shared across set/delete operations. */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days – matches JWT_EXPIRES_IN default
  };
}

/** Attach the auth token cookie to an outgoing NextResponse. */
export function setTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(TOKEN_COOKIE_NAME, token, cookieOptions());
}

/** Remove the auth token cookie. */
export function removeTokenCookie(response: NextResponse): void {
  response.cookies.set(TOKEN_COOKIE_NAME, "", {
    ...cookieOptions(),
    maxAge: 0,
  });
}

/** Read the token from incoming request cookies (server‑component safe). */
export async function getTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE_NAME)?.value;
}
