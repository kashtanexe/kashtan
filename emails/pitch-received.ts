import { button, esc, layout, type RenderedEmail } from "./components/layout";

export function pitchReceivedEmail(p: {
  vendorFirstName: string;
  execFirstName: string;
  fastTrack: boolean;
  slaDate?: string | null;
  statusUrl: string;
}): RenderedEmail {
  const subject = p.fastTrack ? `Fast-Track confirmed: ${p.execFirstName} will review your pitch` : `Your brief for ${p.execFirstName} is in`;
  const promise = p.fastTrack
    ? `<p>Your Fast-Track is confirmed. ${esc(p.execFirstName)} will personally review your pitch by <strong>${esc(p.slaDate ?? "")}</strong>. If that doesn't happen, you are refunded automatically. No need to ask.</p>`
    : `<p>Your brief is being matched against ${esc(p.execFirstName)}'s current priorities. If it's a fit, it goes straight to their review list and you'll hear back by email.</p>`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>${promise}<p style="margin:22px 0;">${button(p.statusUrl, "Check status")}</p>`;
  return {
    subject,
    html: layout({ preheader: subject, body }),
    text: `Hi ${p.vendorFirstName},\n\n${p.fastTrack ? `Fast-Track confirmed. Review by ${p.slaDate}, or automatic refund.` : "Your brief is being matched against current priorities."}\n\nStatus: ${p.statusUrl}`,
  };
}
