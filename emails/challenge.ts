import { button, esc, layout, type RenderedEmail } from "./components/layout";

export interface ChallengeEmailProps {
  execFirstName: string;
  execTitle: string;
  companyName: string;
  vendorFirstName: string;
  originalSubject: string;
  briefUrl: string;
  fastTrackPrice?: string | null;
}

/** "Complete this 60-second brief". Short, personal, one link only (deliverability). */
export function challengeEmail(p: ChallengeEmailProps): RenderedEmail {
  const subject = p.originalSubject ? `Re: ${p.originalSubject}` : `Your note to ${p.execFirstName}`;
  const body = `
<p>Hi ${esc(p.vendorFirstName)},</p>
<p>Thanks for reaching out to ${esc(p.execFirstName)} (${esc(p.execTitle)}, ${esc(p.companyName)}). ${esc(p.execFirstName)} reviews every vendor through a short brief instead of the inbox. It takes about 60 seconds: one sentence, price range, compliance and proof.</p>
<p style="margin:22px 0;">${button(p.briefUrl, "Complete the 60-second brief")}</p>
<p style="color:#475569;font-size:14px;">Briefs that match ${esc(p.execFirstName)}'s current priorities are shown to them directly.${p.fastTrackPrice ? ` If you want a guaranteed human review within 7 days, you can choose Fast-Track (${esc(p.fastTrackPrice)}, refunded automatically if not reviewed in time).` : ""}</p>
<p style="color:#475569;font-size:14px;">You can simply reply to this email if you have questions.</p>`;
  const text = `Hi ${p.vendorFirstName},

Thanks for reaching out to ${p.execFirstName} (${p.execTitle}, ${p.companyName}). ${p.execFirstName} reviews every vendor through a short 60-second brief.

Complete it here: ${p.briefUrl}

Briefs that match current priorities are shown to ${p.execFirstName} directly.`;
  return { subject, html: layout({ preheader: `${p.execFirstName} reviews vendors via a 60-second brief`, body }), text };
}
