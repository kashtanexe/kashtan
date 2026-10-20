import type Stripe from "stripe";
import { logger } from "@/lib/logger";
import { getRepo } from "@/server/repo";
import { runScoring } from "@/server/pitches/submit-brief";
import { computeSlaDeadline } from "./sla";

/** Payment confirmed → fast-track flag + SLA deadline → scoring → surfaced (guaranteed). Idempotent. */
export async function markPaymentPaid(checkoutSessionId: string, paymentIntentId: string | null) {
  const repo = getRepo();
  const payment = await repo.getPaymentBySession(checkoutSessionId);
  if (!payment) throw new Error(`Unknown checkout session ${checkoutSessionId}`);
  if (payment.status === "paid" || payment.status === "refunded") return payment;

  const now = new Date();
  const slaDeadline = computeSlaDeadline(now);
  const updated = await repo.updatePayment(payment.id, { status: "paid", paymentIntentId, paidAt: now.toISOString(), slaDeadline });
  const pitch = await repo.getPitch(payment.pitchId);
  if (pitch) {
    await repo.updatePitch(pitch.id, { fastTrack: true, slaDeadline });
    if (pitch.status === "awaiting_payment" || pitch.status === "brief_submitted") {
      await runScoring(pitch.id, { fastTrackPaid: true });
    } else if (pitch.status === "filtered") {
      await repo.updatePitch(pitch.id, { status: "surfaced" });
    }
  }
  return updated;
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid") return;
      const pi = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
      await markPaymentPaid(session.id, pi);
      return;
    }
    case "checkout.session.expired": {
      const payment = await getRepo().getPaymentBySession(event.data.object.id);
      if (payment && payment.status === "pending") await getRepo().updatePayment(payment.id, { status: "failed" });
      return;
    }
    case "charge.refunded": {
      logger.info("charge refunded", { charge: event.data.object.id });
      return;
    }
    default:
      return;
  }
}
