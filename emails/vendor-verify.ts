import { button, esc, layout, type RenderedEmail } from "./components/layout";

export function vendorVerifyEmail(p: { vendorFirstName: string; execFirstName: string; briefUrl: string }): RenderedEmail {
  const subject = `Confirm your email to pitch ${p.execFirstName}`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>
<p>Confirm your email to open your 60-second brief for ${esc(p.execFirstName)}.</p>
<p style="margin:22px 0;">${button(p.briefUrl, "Confirm & open the brief")}</p>
<p style="color:#475569;font-size:14px;">If you didn't request this, ignore this email.</p>`;
  return { subject, html: layout({ preheader: subject, body }), text: `Confirm your email and open the brief: ${p.briefUrl}` };
}

export function askExecWhoEmail(p: { execFirstName: string; subject: string; appUrl: string }): RenderedEmail {
  const subject = `We couldn't tell who sent "${p.subject}"`;
  const body = `<p>Hi ${esc(p.execFirstName)},</p>
<p>You forwarded <strong>${esc(p.subject)}</strong>, but we couldn't reliably find the original sender, so we didn't contact anyone.</p>
<p style="margin:22px 0;">${button(p.appUrl, "Tell us who it's from")}</p>`;
  return { subject, html: layout({ preheader: subject, body }), text: `${subject}. Open ${p.appUrl}` };
}
