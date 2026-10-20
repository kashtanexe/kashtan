import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { getEnv, isDemoMode } from "@/lib/env";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Open in demo mode when unset. */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return isDemoMode();
  return safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

/** Postmark inbound webhooks use HTTP basic auth embedded in the webhook URL. */
export function isAuthorizedPostmark(req: NextRequest): boolean {
  const { POSTMARK_INBOUND_USER: user, POSTMARK_INBOUND_PASSWORD: pass } = getEnv();
  if (!user || !pass) return isDemoMode();
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  return safeEqual(Buffer.from(header.slice(6), "base64").toString("utf8"), `${user}:${pass}`);
}
