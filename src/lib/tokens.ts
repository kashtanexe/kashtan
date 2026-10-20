import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv, isDemoMode } from "@/lib/env";

/** Signed, expiring tokens for pitch links and 1-click email actions. */
function secret(): string {
  const s = getEnv().TOKEN_SECRET;
  if (s) return s;
  if (!isDemoMode() && process.env.NODE_ENV === "production") {
    throw new Error("TOKEN_SECRET must be set outside demo mode");
  }
  return "gatekeeperai-demo-secret-change-me";
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export interface TokenPayload {
  /** purpose */
  p: "accept" | "pass" | "pitch" | "verify";
  /** subject id (pitch id) */
  s: string;
  /** extra, e.g. pass reason */
  x?: string;
  /** expiry, unix seconds */
  e: number;
}

export function signToken(payload: Omit<TokenPayload, "e">, ttlSeconds = 60 * 60 * 24 * 14): string {
  const body = b64url(JSON.stringify({ ...payload, e: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (payload.e < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Random opaque token stored on the pitch (used in Reply-To r+<token>@...). */
export function opaqueToken(bytes = 12): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64url").replace(/[-_]/g, "x").toLowerCase();
}
