import { baseballCardBlock, button, esc, ghostButton, layout, type RenderedEmail } from "./components/layout";

export function execNewCardEmail(p: {
  execFirstName: string;
  company: string;
  oneLiner: string;
  score: number;
  tldr: string[];
  badges: string[];
  fastTrack: boolean;
  slaText?: string | null;
  cardUrl: string;
  acceptUrl: string;
  passUrls: { label: string; url: string }[];
}): RenderedEmail {
  const subject = p.fastTrack ? `Fast-Track: ${p.company} (${p.score}/100)` : `New match: ${p.company} (${p.score}/100)`;
  const body = `<p>Hi ${esc(p.execFirstName)},</p>
<p>${p.fastTrack ? `A Fast-Track pitch needs your decision${p.slaText ? ` <strong>${esc(p.slaText)}</strong>` : ""}.` : "A pitch cleared your bar."}</p>
${baseballCardBlock({ company: p.company, oneLiner: p.oneLiner, score: p.score, tldr: p.tldr, badges: p.badges, fastTrack: p.fastTrack, link: p.cardUrl })}
<p style="margin:16px 0 6px 0;">${button(p.acceptUrl, "Accept & send calendar link", "#047857")}</p>
<p style="margin:10px 0 4px 0;font-size:13px;color:#64748b;">Or pass in one click:</p>
<p>${p.passUrls.map((x) => ghostButton(x.url, x.label)).join("")}</p>`;
  return {
    subject,
    html: layout({ preheader: p.tldr[0] ?? subject, body, footer: "These buttons work without logging in. Links expire after 14 days." }),
    text: `${subject}\n\n${p.oneLiner}\n- ${p.tldr.join("\n- ")}\n\nAccept: ${p.acceptUrl}\nOpen: ${p.cardUrl}`,
  };
}
