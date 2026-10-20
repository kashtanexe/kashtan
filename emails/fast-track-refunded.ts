import { esc, layout, type RenderedEmail } from "./components/layout";

export function fastTrackRefundedEmail(p: { vendorFirstName: string; execFirstName: string; amount: string }): RenderedEmail {
  const subject = `Refunded: your Fast-Track for ${p.execFirstName}`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>
<p>${esc(p.execFirstName)} didn't review your Fast-Track pitch within the guaranteed 7 days, so we've refunded <strong>${esc(p.amount)}</strong> to your original payment method. No action needed.</p>
<p style="color:#475569;font-size:14px;">Refunds usually appear within 5–10 business days.</p>`;
  return {
    subject,
    html: layout({ preheader: subject, body }),
    text: `Hi ${p.vendorFirstName},\n\n${p.execFirstName} didn't review your Fast-Track pitch within 7 days, so we refunded ${p.amount}.`,
  };
}
