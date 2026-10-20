/** Plain HTML email building blocks (table-based, inline styles: renders in Outlook and Gmail). */

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function layout(opts: { preheader?: string; body: string; footer?: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GatekeeperAI</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader ?? "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb;">
<tr><td style="padding:28px 32px 8px 32px;font-size:15px;line-height:1.6;">${opts.body}</td></tr>
<tr><td style="padding:8px 32px 28px 32px;font-size:12px;line-height:1.5;color:#64748b;border-top:1px solid #f1f5f9;">
${opts.footer ?? `Sent by GatekeeperAI on behalf of the recipient's vendor desk. Payments, when any, go to GatekeeperAI, never to the executive.`}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export function button(href: string, label: string, color = "#254beb"): string {
  return `<a href="${esc(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px;font-size:14px;">${esc(label)}</a>`;
}

export function ghostButton(href: string, label: string): string {
  return `<a href="${esc(href)}" style="display:inline-block;color:#334155;text-decoration:none;font-weight:500;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;margin:0 6px 6px 0;">${esc(label)}</a>`;
}

export function scorePill(score: number): string {
  const color = score >= 85 ? "#047857" : score >= 60 ? "#b45309" : "#b91c1c";
  const bg = score >= 85 ? "#ecfdf5" : score >= 60 ? "#fffbeb" : "#fef2f2";
  return `<span style="display:inline-block;background:${bg};color:${color};font-weight:700;border-radius:999px;padding:2px 10px;font-size:13px;">${score}/100</span>`;
}

export function baseballCardBlock(opts: {
  company: string;
  oneLiner: string;
  score: number;
  tldr: string[];
  badges: string[];
  fastTrack?: boolean;
  link?: string;
}): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;margin:12px 0;">
<tr><td style="padding:16px 18px;">
<div style="font-size:16px;font-weight:700;">${esc(opts.company)} ${scorePill(opts.score)} ${opts.fastTrack ? `<span style="background:#eef4ff;color:#1d39d8;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:600;">Fast-Track</span>` : ""}</div>
<div style="color:#334155;margin:6px 0 8px 0;">${esc(opts.oneLiner)}</div>
<ul style="margin:0 0 8px 18px;padding:0;color:#0f172a;">${opts.tldr.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
<div style="font-size:12px;color:#64748b;">${opts.badges.map(esc).join(" · ")} <span style="color:#94a3b8">(self-attested)</span></div>
${opts.link ? `<div style="margin-top:10px;"><a href="${esc(opts.link)}" style="color:#254beb;font-weight:600;text-decoration:none;font-size:14px;">Open card →</a></div>` : ""}
</td></tr></table>`;
}
