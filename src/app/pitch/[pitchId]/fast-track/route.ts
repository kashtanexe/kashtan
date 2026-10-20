import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { signToken } from "@/lib/tokens";
import { createFastTrackCheckout } from "@/server/payments/create-checkout";
import { canAccessPitch } from "@/server/pitches/access";
import { getRepo } from "@/server/repo";

/** POST /pitch/:id/fast-track?t=… → Stripe Checkout (or the simulated checkout in demo mode). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ pitchId: string }> }) {
  const { pitchId } = await params;
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!canAccessPitch(pitchId, token)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const repo = getRepo();
  const pitch = await repo.getPitch(pitchId);
  if (!pitch) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (pitch.fastTrack) return NextResponse.redirect(`${appUrl()}/pitch/${pitchId}/status?t=${encodeURIComponent(token)}`, 303);
  if (pitch.status === "brief_submitted") await repo.updatePitch(pitchId, { status: "awaiting_payment" });
  const { url } = await createFastTrackCheckout(pitchId);
  const t = token || signToken({ p: "pitch", s: pitchId });
  return NextResponse.redirect(url.startsWith("/") ? `${appUrl()}${url}&t=${encodeURIComponent(t)}` : url, 303);
}
