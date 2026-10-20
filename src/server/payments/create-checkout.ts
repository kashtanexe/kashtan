import { appUrl, features } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { randomId } from "@/lib/utils";
import { getRepo } from "@/server/repo";
import { markPaymentPaid } from "./handle-stripe-event";

/**
 * Create a Fast-Track checkout. With Stripe keys: a real Checkout Session.
 * In demo mode: a pending payment and a simulated checkout page.
 */
export async function createFastTrackCheckout(pitchId: string): Promise<{ url: string }> {
  const repo = getRepo();
  const pitch = await repo.getPitch(pitchId);
  if (!pitch) throw new Error("Pitch not found");
  const exec = (await repo.getExec(pitch.execId))!;
  const contact = await repo.getContact(pitch.contactId);

  if (features.stripe()) {
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: contact?.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: exec.currency.toLowerCase(),
            unit_amount: exec.fastTrackPriceCents,
            product_data: {
              name: `Fast-Track review by ${exec.fullName}`,
              description: "Guaranteed personal review within 7 days, or an automatic refund. Paid to FILTR, never to the executive.",
            },
          },
        },
      ],
      payment_intent_data: { metadata: { pitchId } },
      metadata: { pitchId, charity: String(exec.charityEnabled) },
      success_url: `${appUrl()}/pitch/${pitchId}/submitted?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/pitch/${pitchId}?cancelled=1`,
    });
    await repo.createPayment({
      pitchId,
      provider: "stripe",
      checkoutSessionId: session.id,
      paymentIntentId: null,
      amountCents: exec.fastTrackPriceCents,
      currency: exec.currency,
      status: "pending",
      charity: exec.charityEnabled,
      slaDeadline: null,
      refundId: null,
      paidAt: null,
      refundedAt: null,
    });
    return { url: session.url! };
  }

  const sessionId = randomId("cs_demo");
  await repo.createPayment({
    pitchId,
    provider: "demo",
    checkoutSessionId: sessionId,
    paymentIntentId: null,
    amountCents: exec.fastTrackPriceCents,
    currency: exec.currency,
    status: "pending",
    charity: exec.charityEnabled,
    slaDeadline: null,
    refundId: null,
    paidAt: null,
    refundedAt: null,
  });
  return { url: `/pitch/${pitchId}/checkout?session=${sessionId}` };
}

/** Demo checkout "Pay" button. */
export async function completeDemoCheckout(sessionId: string) {
  if (features.stripe()) throw new Error("Simulated payments are disabled when Stripe is configured");
  return markPaymentPaid(sessionId, `pi_demo_${sessionId.slice(-8)}`);
}
