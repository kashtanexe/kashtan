import { isDemoMode } from "@/lib/env";
import { verifyToken } from "@/lib/tokens";

/**
 * Vendor-facing pitch pages are capability URLs: /pitch/<id>?t=<signed token>.
 * In demo mode the token is optional so the demo can deep-link anywhere.
 */
export function canAccessPitch(pitchId: string, token: string | undefined | null): boolean {
  if (token) {
    const p = verifyToken(token);
    if (p && p.p === "pitch" && p.s === pitchId) return true;
  }
  return isDemoMode();
}
