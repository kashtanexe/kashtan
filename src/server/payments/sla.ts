import { fastTrackRefundedEmail } from "@emails/fast-track-refunded";
import { deskFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { features } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getStripe } from "@/lib/stripe";
import { formatEur } from "@/lib/utils";
import { getRepo } from "@/server/repo";
import type { Payment, Pitch } from "@/types/domain";

export const SLA_DAYS = 7;

export function computeSlaDeadline(paidAt: Date, days = SLA_DAYS): string {
  return new Date(paidAt.getTime() + days * 86_400_000).toISOString();
}

/** A paid fast-track breaches its SLA if the deadline passed and the exec hasn't decided. */
export function isSlaBreached(payment: Pick<Payment, "status" | "slaDeadline">, pitch: Pick<Pitch, "status">, now: Date): boolean {
  if (payment.status !== "paid" || !payment.slaDeadline) return false;
  if (pitch.status === "accepted" || pitch.status === "passed") return false;
  return new Date(payment.slaDeadline).getTime() <= now.getTime();
}

export async function refundPayment(payment: Payment): Promise<string> {
  if (payment.provider === "stripe" && features.stripe() && payment.paymentIntentId) {
    const refund = await getStripe().refunds.create(
      { payment_intent: payment.paymentIntentId, reason: "requested_by_customer", metadata: { reason: "sla_missed", pitchId: payment.pitchId } },
      { idempotencyKey: `sla-refund-${payment.id}` },
    );
    return refund.id;
  }
  return `re_demo_${payment.id}`;
}

/** Cron: refund every fast-track whose 7-day review promise was missed. */
export async function enforceSla(now = new Date()): Promise<{ checked: number; refunded: string[] }> {
  const repo = getRepo();
  const paid = await repo.listPayments({ status: "paid" });
  const refunded: string[] = [];
  for (const payment of paid) {
    const pitch = await repo.getPitch(payment.pitchId);
    if (!pitch || !isSlaBreached(payment, pitch, now)) continue;
    try {
      const refundId = await refundPayment(payment);
      await repo.updatePayment(payment.id, { status: "refunded", refundId, refundedAt: now.toISOString() });
      if (pitch.status !== "expired") await repo.updatePitch(pitch.id, { status: "expired" });
      await repo.updatePitch(pitch.id, { status: "refunded" });
      const [exec, contact, answers] = await Promise.all([repo.getExec(pitch.execId), repo.getContact(pitch.contactId), repo.getAnswers(pitch.id)]);
      if (exec && contact) {
        const em = fastTrackRefundedEmail({
          vendorFirstName: (answers?.contactName || contact.name).split(" ")[0]!,
          execFirstName: exec.fullName.split(" ")[0]!,
          amount: formatEur(payment.amountCents, payment.currency),
        });
        await sendEmail({ kind: "fast_track_refunded", to: contact.email, from: deskFrom(exec.fullName), subject: em.subject, html: em.html, text: em.text, pitchId: pitch.id, execId: exec.id, stream: "challenges" });
      }
      refunded.push(pitch.id);
    } catch (err) {
      logger.error("sla refund failed", { pitchId: pitch.id, err: String(err) });
    }
  }
  return { checked: paid.length, refunded };
}
