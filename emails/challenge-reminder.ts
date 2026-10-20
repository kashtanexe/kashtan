import { button, esc, layout, type RenderedEmail } from "./components/layout";

export function challengeReminderEmail(p: { vendorFirstName: string; execFirstName: string; briefUrl: string; originalSubject: string }): RenderedEmail {
  const subject = p.originalSubject ? `Re: ${p.originalSubject}` : `Reminder: your brief for ${p.execFirstName}`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>
<p>A quick reminder: ${esc(p.execFirstName)} only reviews vendors who complete the short brief. It's still open for a few more days.</p>
<p style="margin:22px 0;">${button(p.briefUrl, "Finish the brief")}</p>
<p style="color:#475569;font-size:14px;">This is the only reminder we'll send.</p>`;
  return {
    subject,
    html: layout({ preheader: "Your brief is still open", body }),
    text: `Hi ${p.vendorFirstName}, a quick reminder: ${p.execFirstName} only reviews vendors who complete the brief. ${p.briefUrl}\nThis is the only reminder we'll send.`,
  };
}
