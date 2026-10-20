import type { PostmarkHeader, PostmarkInboundPayload } from "@/lib/email/types";

export type ExtractionMethod = "rfc822" | "header_block" | "fallback" | "none";

export interface ExtractedSender {
  email: string | null;
  name: string;
  subject: string;
  date: string;
  body: string;
  method: ExtractionMethod;
  confidence: number;
  /** Original message headers, only available for rfc822 attachments. */
  headers?: PostmarkHeader[];
  /** Language of the header block that matched, when known. */
  locale?: "en" | "fr" | "de" | "nl" | "es";
}

export interface ExtractOptions {
  /** Addresses that are never "the original sender" (the exec, our aliases). */
  excludeAddresses?: string[];
  /** Domains to skip (our own inbound/mail domains). */
  excludeDomains?: string[];
}

/** Below this the pipeline should ask the exec instead of challenging someone. */
export const MIN_CONFIDENCE = 0.6;

// ---------------------------------------------------------------------------
// Localised forward markers and header labels (EN / FR / DE / NL / ES)
// ---------------------------------------------------------------------------

const FORWARD_MARKERS: { re: RegExp; locale: ExtractedSender["locale"] }[] = [
  { re: /-{2,}\s*Forwarded message\s*-{2,}/i, locale: "en" },
  { re: /Begin forwarded message\s*:/i, locale: "en" },
  { re: /-{2,}\s*Original Message\s*-{2,}/i, locale: "en" },
  { re: /-{2,}\s*Message transf[ée]r[ée]\s*-{2,}/i, locale: "fr" },
  { re: /D[ée]but du message (r[ée]exp[ée]di[ée]|transf[ée]r[ée])\s*:/i, locale: "fr" },
  { re: /-{2,}\s*Message d'origine\s*-{2,}/i, locale: "fr" },
  { re: /-{2,}\s*Weitergeleitete Nachricht\s*-{2,}/i, locale: "de" },
  { re: /Anfang der weitergeleiteten (Nachricht|E-Mail)\s*:/i, locale: "de" },
  { re: /-{2,}\s*Urspr[üu]ngliche Nachricht\s*-{2,}/i, locale: "de" },
  { re: /-{2,}\s*Doorgestuurd bericht\s*-{2,}/i, locale: "nl" },
  { re: /Begin doorgestuurd bericht\s*:/i, locale: "nl" },
  { re: /-{2,}\s*Oorspronkelijk bericht\s*-{2,}/i, locale: "nl" },
  { re: /-{2,}\s*Mensaje reenviado\s*-{2,}/i, locale: "es" },
  { re: /Inicio del mensaje reenviado\s*:/i, locale: "es" },
  { re: /-{2,}\s*Mensaje original\s*-{2,}/i, locale: "es" },
];

const FROM_LABELS = ["From", "De", "Von", "Van", "Desde"];
const SUBJECT_LABELS = ["Subject", "Objet", "Sujet", "Betreff", "Onderwerp", "Asunto"];
const DATE_LABELS = ["Date", "Sent", "Envoyé", "Envoye", "Gesendet", "Datum", "Verzonden", "Enviado", "Fecha"];
const OTHER_LABELS = ["To", "Cc", "À", "A", "An", "Aan", "Para", "Reply-To", "Répondre à"];
const ALL_LABELS = [...FROM_LABELS, ...SUBJECT_LABELS, ...DATE_LABELS, ...OTHER_LABELS];

const LABEL_LOCALE: Record<string, ExtractedSender["locale"]> = {
  de: "fr", // "De :" is FR or ES; refined below by sibling labels
  von: "de",
  van: "nl",
  desde: "es",
  from: "en",
};

const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const EMAIL_RE_G = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function labelPattern(labels: string[]): string {
  return labels.map((l) => l.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")).join("|");
}

// "From: Jane <a@b.com>", "De : Jane [mailto:a@b.com]", "*From:* Jane", "> Von: Jane <a@b.com>"
const HEADER_LINE_RE = new RegExp(`^[\\s>*_]*(${labelPattern(ALL_LABELS)})[\\s*_]*\\s?:[\\s*_]*(.*)$`, "i");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<hr[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

/** Decode RFC 2047 encoded-words (=?UTF-8?B?...?= / =?UTF-8?Q?...?=). */
export function decodeEncodedWords(s: string): string {
  return s.replace(/=\?([^?]+)\?([bqBQ])\?([^?]*)\?=/g, (_m, charset: string, enc: string, data: string) => {
    try {
      let bytes: Buffer;
      if (enc.toUpperCase() === "B") bytes = Buffer.from(data, "base64");
      else
        bytes = Buffer.from(
          data.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_x, h: string) => String.fromCharCode(parseInt(h, 16))),
          "binary",
        );
      const cs = charset.toLowerCase();
      return bytes.toString(cs === "utf-8" || cs === "utf8" ? "utf8" : "latin1");
    } catch {
      return data;
    }
  });
}

export function parseAddress(value: string): { email: string | null; name: string } {
  const v = decodeEncodedWords(value).replace(/\*/g, "").trim();
  const angle = v.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
  const mailto = v.match(/\[\s*mailto:\s*([^\]\s]+)\s*\]/i);
  const paren = v.match(/\(\s*([^()\s]+@[^()\s]+)\s*\)/);
  const bare = v.match(EMAIL_RE);
  const email = (angle?.[1] ?? mailto?.[1] ?? paren?.[1] ?? bare?.[0] ?? null)?.toLowerCase().replace(/^mailto:/, "") ?? null;
  let name = v
    .replace(/<[^>]*>/g, "")
    .replace(/\[mailto:[^\]]*\]/gi, "")
    .replace(/\([^)]*@[^)]*\)/g, "")
    .replace(EMAIL_RE_G, "")
    .replace(/["']/g, "")
    .trim();
  if (!name && email) name = email.split("@")[0]!;
  return { email, name };
}

function isExcluded(email: string, opts: ExtractOptions): boolean {
  const e = email.toLowerCase();
  if (opts.excludeAddresses?.some((a) => a.toLowerCase() === e)) return true;
  const domain = e.split("@")[1] ?? "";
  return Boolean(opts.excludeDomains?.some((d) => domain === d.toLowerCase() || domain.endsWith(`.${d.toLowerCase()}`)));
}

// ---------------------------------------------------------------------------
// Layer 1: message/rfc822 attachment
// ---------------------------------------------------------------------------

function unfoldHeaders(raw: string): PostmarkHeader[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: PostmarkHeader[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && out.length > 0) {
      out[out.length - 1]!.Value += " " + line.trim();
      continue;
    }
    const idx = line.indexOf(":");
    if (idx > 0) out.push({ Name: line.slice(0, idx).trim(), Value: line.slice(idx + 1).trim() });
  }
  return out;
}

function decodeQuotedPrintable(s: string): string {
  const bin = s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, h: string) => String.fromCharCode(parseInt(h, 16)));
  return Buffer.from(bin, "binary").toString("utf8");
}

function extractTextBody(headers: PostmarkHeader[], body: string): string {
  const ct = headers.find((h) => h.Name.toLowerCase() === "content-type")?.Value ?? "text/plain";
  const cte = headers.find((h) => h.Name.toLowerCase() === "content-transfer-encoding")?.Value?.toLowerCase() ?? "";
  const boundary = ct.match(/boundary="?([^";]+)"?/i)?.[1];
  if (/multipart\//i.test(ct) && boundary) {
    const parts = body.split(`--${boundary}`).slice(1);
    let htmlFallback = "";
    for (const part of parts) {
      if (part.startsWith("--")) break;
      const sep = part.replace(/\r\n/g, "\n").indexOf("\n\n");
      if (sep < 0) continue;
      const ph = unfoldHeaders(part.replace(/\r\n/g, "\n").slice(0, sep));
      const pb = part.replace(/\r\n/g, "\n").slice(sep + 2);
      const pct = ph.find((h) => h.Name.toLowerCase() === "content-type")?.Value ?? "";
      if (/multipart\//i.test(pct)) {
        const nested = extractTextBody(ph, pb);
        if (nested) return nested;
      }
      if (/text\/plain/i.test(pct)) return extractTextBody(ph, pb);
      if (/text\/html/i.test(pct)) htmlFallback = htmlToText(extractTextBody(ph, pb));
    }
    return htmlFallback;
  }
  let decoded = body;
  if (cte.includes("base64")) decoded = Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
  else if (cte.includes("quoted-printable")) decoded = decodeQuotedPrintable(body);
  return /text\/html/i.test(ct) ? htmlToText(decoded) : decoded;
}

function fromRfc822(payload: PostmarkInboundPayload, opts: ExtractOptions): ExtractedSender | null {
  const att = payload.Attachments?.find(
    (a) => /message\/rfc822/i.test(a.ContentType) || /\.eml$/i.test(a.Name),
  );
  if (!att) return null;
  let raw: string;
  try {
    raw = Buffer.from(att.Content, "base64").toString("utf8");
  } catch {
    return null;
  }
  const norm = raw.replace(/\r\n/g, "\n");
  const sep = norm.indexOf("\n\n");
  const headers = unfoldHeaders(sep >= 0 ? norm.slice(0, sep) : norm);
  const body = sep >= 0 ? norm.slice(sep + 2) : "";
  const fromVal = headers.find((h) => h.Name.toLowerCase() === "from")?.Value;
  if (!fromVal) return null;
  const { email, name } = parseAddress(fromVal);
  if (!email || isExcluded(email, opts)) return null;
  return {
    email,
    name,
    subject: decodeEncodedWords(headers.find((h) => h.Name.toLowerCase() === "subject")?.Value ?? ""),
    date: headers.find((h) => h.Name.toLowerCase() === "date")?.Value ?? "",
    body: extractTextBody(headers, body).trim(),
    method: "rfc822",
    confidence: 0.98,
    headers,
  };
}

// ---------------------------------------------------------------------------
// Layer 2: forwarded header blocks in the body (multi-client, multi-language)
// ---------------------------------------------------------------------------

function fromHeaderBlock(text: string, opts: ExtractOptions): ExtractedSender | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  // Where does the forwarded part start?
  let markerLine = -1;
  let markerLocale: ExtractedSender["locale"];
  for (let i = 0; i < lines.length && markerLine < 0; i++) {
    for (const m of FORWARD_MARKERS) {
      if (m.re.test(lines[i]!)) {
        markerLine = i;
        markerLocale = m.locale;
        break;
      }
    }
  }

  const fromLabelRe = new RegExp(`^(${labelPattern(FROM_LABELS)})$`, "i");
  for (let i = Math.max(0, markerLine); i < lines.length; i++) {
    const m = lines[i]!.match(HEADER_LINE_RE);
    if (!m || !fromLabelRe.test(m[1]!.trim())) continue;

    // Collect the header block: this line plus following "Label: value" lines.
    const block: Record<string, string> = {};
    const labelsSeen: string[] = [];
    let j = i;
    for (; j < lines.length; j++) {
      const hm = lines[j]!.match(HEADER_LINE_RE);
      if (!hm) {
        if (lines[j]!.trim() === "" || lines[j]!.replace(/^[\s>]*/, "") === "") {
          if (Object.keys(block).length > 0) break;
          continue;
        }
        // Wrapped header value (e.g. long To: lines)
        if (j > i && Object.keys(block).length > 0 && !/:/.test(lines[j]!)) continue;
        break;
      }
      const label = hm[1]!.toLowerCase();
      labelsSeen.push(label);
      if (!(label in block)) block[label] = hm[2]!.trim();
    }

    const fromKey = Object.keys(block).find((k) => fromLabelRe.test(k));
    if (!fromKey) continue;
    let { email, name } = parseAddress(block[fromKey]!);
    // Outlook sometimes puts the address on the next line, or only shows a display name.
    if (!email) {
      const nextLine = lines[i + 1] ?? "";
      const em = nextLine.match(EMAIL_RE);
      if (em && !HEADER_LINE_RE.test(nextLine)) email = em[0].toLowerCase();
    }
    if (!email || isExcluded(email, opts)) continue;

    const pick = (labels: string[]) => {
      const k = Object.keys(block).find((key) => labels.some((l) => l.toLowerCase() === key));
      return k ? block[k]! : "";
    };

    let locale = markerLocale ?? LABEL_LOCALE[fromKey];
    if (fromKey === "de") {
      locale = labelsSeen.some((l) => ["para", "asunto", "enviado", "fecha"].includes(l)) ? "es" : "fr";
    }

    const body = lines
      .slice(j)
      .map((l) => l.replace(/^>\s?/, ""))
      .join("\n")
      .trim();

    return {
      email,
      name,
      subject: decodeEncodedWords(pick(SUBJECT_LABELS)),
      date: pick(DATE_LABELS),
      body,
      method: "header_block",
      confidence: markerLine >= 0 ? 0.92 : 0.75,
      locale,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Layer 3: any plausible address in the body (low confidence)
// ---------------------------------------------------------------------------

function fromFallback(text: string, opts: ExtractOptions): ExtractedSender | null {
  for (const m of text.matchAll(EMAIL_RE_G)) {
    const email = m[0].toLowerCase();
    if (isExcluded(email, opts)) continue;
    return { email, name: email.split("@")[0]!, subject: "", date: "", body: text.trim(), method: "fallback", confidence: 0.35 };
  }
  return null;
}

/**
 * Find who originally wrote a forwarded email.
 * Layers: rfc822 attachment → localised header block → loose address scan.
 * (score-pitch's LLM fallback may be applied by the caller when confidence is low.)
 */
export function extractOriginalSender(payload: PostmarkInboundPayload, opts: ExtractOptions = {}): ExtractedSender {
  const viaAttachment = fromRfc822(payload, opts);
  if (viaAttachment) return viaAttachment;

  const text = payload.TextBody?.trim() ? payload.TextBody : htmlToText(payload.HtmlBody ?? "");
  const viaBlock = fromHeaderBlock(text, opts);
  if (viaBlock) {
    if (!viaBlock.subject) viaBlock.subject = (payload.Subject ?? "").replace(/^\s*((fwd?|tr|wg|fw|rv|doorst)\s*:\s*)+/i, "");
    return viaBlock;
  }

  // HTML may contain the block even when the text part was mangled.
  if (payload.HtmlBody && payload.TextBody) {
    const viaHtml = fromHeaderBlock(htmlToText(payload.HtmlBody), opts);
    if (viaHtml) return viaHtml;
  }

  const viaFallback = fromFallback(text, opts);
  if (viaFallback) {
    viaFallback.subject = (payload.Subject ?? "").replace(/^\s*((fwd?|tr|wg|fw|rv)\s*:\s*)+/i, "");
    return viaFallback;
  }

  return { email: null, name: "", subject: payload.Subject ?? "", date: "", body: text, method: "none", confidence: 0 };
}
