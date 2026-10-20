import { NextResponse, type NextRequest } from "next/server";
import { features, getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/server/payments/handle-stripe-event";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!features.stripe()) return NextResponse.json({ error: "stripe not configured" }, { status: 404 });
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `invalid signature: ${String(err)}` }, { status: 400 });
  }
  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("stripe webhook failed", { type: event.type, id: event.id, err: String(err) });
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
