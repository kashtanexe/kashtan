import { button, esc, layout, type RenderedEmail } from "./components/layout";

export function pitchAcceptedEmail(p: { vendorFirstName: string; execFullName: string; execFirstName: string; bookingUrl: string }): RenderedEmail {
  const subject = `${p.execFirstName} would like to meet`;
  const body = `<p>Hi ${esc(p.vendorFirstName)},</p>
<p>Good news: ${esc(p.execFullName)} reviewed your brief and would like a short intro call.</p>
<p style="margin:22px 0;">${button(p.bookingUrl || "#", "Book a time", "#047857")}</p>
<p style="color:#475569;font-size:14px;">Please come prepared to go straight into the specifics you outlined in the brief.</p>`;
  return {
    subject,
    html: layout({ preheader: `${p.execFirstName} accepted your pitch`, body }),
    text: `Hi ${p.vendorFirstName},\n\n${p.execFullName} would like a short intro call. Book a time: ${p.bookingUrl}`,
  };
}
