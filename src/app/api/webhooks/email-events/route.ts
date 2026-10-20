import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedPostmark } from "@/lib/route-auth";
import { getRepo } from "@/server/repo";

export const dynamic = "force-dynamic";

interface PostmarkEvent {
  RecordType?: string; // Bounce | SpamComplaint | Delivery | SubscriptionChange
  Type?: string; // HardBounce, ...
  Email?: string;
  Recipient?: string;
  MessageID?: string;
  SuppressSending?: boolean;
}

/** Bounces and spam complaints → suppression list (we never challenge that address again). */
export async function POST(req: NextRequest) {
  if (!isAuthorizedPostmark(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ev = (await req.json().catch(() => ({}))) as PostmarkEvent;
  const email = (ev.Email ?? ev.Recipient ?? "").toLowerCase();
  if (!email) return NextResponse.json({ ok: true, ignored: true });
  const repo = getRepo();
  await repo.recordEmailEvent({ type: ev.RecordType ?? "unknown", email, providerMessageId: ev.MessageID, payload: ev });
  const suppress = ev.RecordType === "SpamComplaint" || (ev.RecordType === "Bounce" && ev.Type === "HardBounce") || (ev.RecordType === "SubscriptionChange" && ev.SuppressSending);
  if (suppress) await repo.addSuppression(email, `${ev.RecordType}${ev.Type ? `:${ev.Type}` : ""}`);
  return NextResponse.json({ ok: true, suppressed: Boolean(suppress) });
}
