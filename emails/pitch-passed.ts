import { esc, layout, type RenderedEmail } from "./components/layout";

export function pitchPassedEmail(p: { vendorFirstName: string; execFirstName: string; reasonLabel: string }): RenderedEmail {
  const subject = `Update on your pitch to ${p.execFirstName}`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>
<p>Thanks for taking the time to complete the brief. ${esc(p.execFirstName)} reviewed it and is passing for now.</p>
<p style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;"><strong>Reason:</strong> ${esc(p.reasonLabel)}</p>
<p style="color:#475569;font-size:14px;">Priorities change every quarter. A clear "not now" beats silence, and you're welcome to submit a new brief next quarter.</p>`;
  return {
    subject,
    html: layout({ preheader: `${p.execFirstName} passed: ${p.reasonLabel}`, body }),
    text: `Hi ${p.vendorFirstName},\n\n${p.execFirstName} reviewed your brief and is passing for now.\nReason: ${p.reasonLabel}`,
  };
}
