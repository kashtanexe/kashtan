import { NextResponse, type NextRequest } from "next/server";
import type { PostmarkInboundPayload } from "@/lib/email/types";
import { logger } from "@/lib/logger";
import { isAuthorizedPostmark } from "@/lib/route-auth";
import { handleInbound } from "@/server/intake/handle-inbound";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Postmark inbound webhook. Idempotent on MessageID; 5xx makes Postmark retry. */
export async function POST(req: NextRequest) {
  if (!isAuthorizedPostmark(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let payload: PostmarkInboundPayload;
  try {
    payload = (await req.json()) as PostmarkInboundPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  try {
    const result = await handleInbound(payload);
    return NextResponse.json(result);
  } catch (err) {
    logger.error("inbound webhook failed", { err: String(err), messageId: payload.MessageID });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
