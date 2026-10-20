import { baseballCardBlock, button, esc, layout, type RenderedEmail } from "./components/layout";

export interface DigestCard {
  company: string;
  oneLiner: string;
  score: number;
  tldr: string[];
  badges: string[];
  fastTrack: boolean;
  slaDeadline: string | null;
  cardUrl: string;
  acceptUrl: string;
}

export interface DigestData {
  execFirstName: string;
  weekLabel: string;
  stats: {
    received: number;
    submitted: number;
    surfaced: number;
    filtered: number;
    accepted: number;
    passed: number;
    minutesSaved: number;
    fastTrackRevenueCents: number;
  };
  cards: DigestCard[];
  filteredSample: { company: string; reason: string }[];
  inboxUrl: string;
  filteredUrl: string;
  timezone: string;
}

function stat(label: string, value: string | number): string {
  return `<td align="center" style="padding:10px 4px;"><div style="font-size:22px;font-weight:700;color:#0f172a;">${esc(String(value))}</div><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;">${esc(label)}</div></td>`;
}

function slaText(iso: string | null): string {
  if (!iso) return "";
  const hours = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
  return hours <= 0 ? "SLA due now" : hours < 48 ? `SLA in ${hours}h` : `SLA in ${Math.round(hours / 24)}d`;
}

export function weeklyDigestEmail(d: DigestData): RenderedEmail {
  const s = d.stats;
  const subject = s.surfaced > 0 ? `${s.surfaced} pitch${s.surfaced === 1 ? "" : "es"} worth your time this week` : "Your vendor desk: a quiet week";
  const cards = d.cards
    .map(
      (c) =>
        baseballCardBlock({ company: c.company, oneLiner: c.oneLiner, score: c.score, tldr: c.tldr, badges: c.badges, fastTrack: c.fastTrack, link: c.cardUrl }) +
        `<div style="margin:-4px 0 14px 2px;font-size:13px;"><a href="${esc(c.acceptUrl)}" style="color:#047857;font-weight:600;text-decoration:none;">Accept & send calendar link</a>${c.fastTrack ? ` <span style="color:#b45309;"> · ${esc(slaText(c.slaDeadline))}</span>` : ""}</div>`,
    )
    .join("");
  const body = `
<p style="font-size:13px;color:#64748b;margin:0 0 4px 0;">Friday digest · ${esc(d.weekLabel)}</p>
<h1 style="font-size:22px;margin:0 0 12px 0;">Good morning ${esc(d.execFirstName)}</h1>
<p style="margin:0 0 14px 0;">Your vendor desk handled <strong>${s.received}</strong> cold pitch${s.received === 1 ? "" : "es"} this week. ${s.surfaced} need a decision; everything else was filtered or is waiting on the vendor.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;margin:8px 0 18px 0;"><tr>
${stat("Received", s.received)}${stat("Briefs", s.submitted)}${stat("For you", s.surfaced)}${stat("Filtered", s.filtered)}${stat("Min saved", s.minutesSaved)}
</tr></table>
${d.cards.length > 0 ? `<h2 style="font-size:16px;margin:18px 0 4px 0;">Waiting for your decision</h2>${cards}` : `<p>No pitches cleared your bar this week. That's the filter working.</p>`}
${
  d.filteredSample.length > 0
    ? `<h2 style="font-size:14px;margin:18px 0 6px 0;color:#475569;">Filtered out (sample)</h2><ul style="margin:0 0 10px 18px;padding:0;color:#475569;font-size:13px;">${d.filteredSample
        .map((f) => `<li><strong>${esc(f.company)}</strong>: ${esc(f.reason)}</li>`)
        .join("")}</ul><p style="font-size:13px;"><a href="${esc(d.filteredUrl)}" style="color:#254beb;text-decoration:none;">Audit everything that was filtered →</a></p>`
    : ""
}
<p style="margin:20px 0;">${button(d.inboxUrl, "Open your inbox")}</p>
<p style="font-size:13px;color:#64748b;">This week: ${s.accepted} accepted · ${s.passed} passed.</p>`;
  const text = `${subject}\n\nReceived ${s.received} · Briefs ${s.submitted} · For you ${s.surfaced} · Filtered ${s.filtered}\n\n${d.cards
    .map((c) => `${c.company} (${c.score}/100): ${c.oneLiner}\n  ${c.cardUrl}`)
    .join("\n")}\n\nInbox: ${d.inboxUrl}`;
  return { subject, html: layout({ preheader: subject, body, footer: "Sent every Friday at 08:00 your time. Change it in Settings." }), text };
}
