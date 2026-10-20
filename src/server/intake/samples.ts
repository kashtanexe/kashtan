import type { PostmarkInboundPayload } from "@/lib/email/types";
import { forwardingAddress, publicAlias } from "@/lib/email/headers";
import type { ExecProfile } from "@/types/domain";

/** Realistic inbound emails for the "Simulate inbound email" demo page. */
export const SAMPLE_KEYS = ["gmail_forward", "outlook_fr_forward", "ios_forward", "rfc822_forward", "direct_alias", "ooo_reply", "spoofed_forward", "newsletter"] as const;
export type SampleKey = (typeof SAMPLE_KEYS)[number];

export const SAMPLE_META: Record<SampleKey, { label: string; description: string; expect: string }> = {
  gmail_forward: { label: "Gmail forward (EN)", description: "Exec forwards a cold email from Gmail web.", expect: "Challenge sent to the original sender" },
  outlook_fr_forward: { label: "Outlook forward (FR)", description: "Outlook desktop in French: De : / Envoyé : / Objet :", expect: "Challenge sent to the original sender" },
  ios_forward: { label: "iPhone Mail forward", description: "“Begin forwarded message:” with quoted headers.", expect: "Challenge sent to the original sender" },
  rfc822_forward: { label: "Forward as attachment (.eml)", description: "The clean case: message/rfc822 attachment.", expect: "Challenge sent to the original sender" },
  direct_alias: { label: "Vendor writes to the alias", description: "A vendor emails the public alias directly.", expect: "Challenge sent to the vendor" },
  ooo_reply: { label: "Out-of-office auto-reply", description: "Vendor's OOO bot replies to our challenge.", expect: "Dropped by the loop guard, nobody contacted" },
  spoofed_forward: { label: "Spoofed exec forward", description: "Someone fakes the exec's From to use us as a spam relay.", expect: "Dropped: DMARC fail, nobody contacted" },
  newsletter: { label: "Newsletter to the alias", description: "Bulk mail with List-Unsubscribe.", expect: "Dropped by the loop guard" },
};

const SENDERS = [
  { name: "Sophie Laurent", company: "Cyberlynx", domain: "cyberlynx.eu", topic: "DORA incident reporting" },
  { name: "Daniel Okafor", company: "Signalpath", domain: "signalpath.io", topic: "SIEM cost" },
  { name: "Mia Koch", company: "Passwerk", domain: "passwerk.de", topic: "passkeys" },
  { name: "Lucas Martin", company: "Promptwall", domain: "promptwall.ai", topic: "generative AI data leakage" },
  { name: "Elena Rossi", company: "Redline Assurance", domain: "redline-assurance.com", topic: "TLPT red teaming" },
  { name: "Noah Visser", company: "Thirdsight", domain: "thirdsight.nl", topic: "ICT third-party risk" },
  { name: "Hannah Berg", company: "Vaultline", domain: "vaultline.io", topic: "secrets management" },
  { name: "Omar Haddad", company: "Brightgate", domain: "brightgate.eu", topic: "phishing-resistant MFA" },
  { name: "Clara Nilsson", company: "Fjordsec", domain: "fjordsec.se", topic: "DORA incident reporting" },
  { name: "Tomás García", company: "Logbalance", domain: "logbalance.es", topic: "SIEM cost" },
  { name: "Julia Novak", company: "Keystride", domain: "keystride.eu", topic: "passkeys" },
  { name: "Pieter de Wit", company: "Maskwise", domain: "maskwise.nl", topic: "generative AI data leakage" },
  { name: "Ines Moreau", company: "Assaut Rouge", domain: "assautrouge.fr", topic: "TLPT red teaming" },
  { name: "Felix Wagner", company: "Lieferkette Risk", domain: "lieferkette-risk.de", topic: "ICT third-party risk" },
  { name: "Aoife Byrne", company: "Keyfort", domain: "keyfort.ie", topic: "secrets management" },
  { name: "Marco Bianchi", company: "Authline", domain: "authline.it", topic: "phishing-resistant MFA" },
];

const senderEmail = (s: (typeof SENDERS)[number], n = 0) => {
  const [first, ...rest] = s.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(" ");
  return `${first}.${rest.join("")}${n ? n : ""}@${s.domain}`;
};

/** Prefer senders this exec hasn't been pitched by (each sender is challenged once per 30 days). */
function pickSender(exclude: Set<string>) {
  const shuffled = [...SENDERS].sort(() => Math.random() - 0.5);
  for (let n = 0; n < 50; n++) {
    for (const s of shuffled) {
      const email = senderEmail(s, n);
      if (!exclude.has(email)) return { s, email };
    }
  }
  return { s: shuffled[0]!, email: senderEmail(shuffled[0]!, Date.now() % 1000) };
}

const PITCH_BODY: Record<string, string> = {
  "DORA incident reporting": "we help EU payment institutions automate DORA major-incident reporting and the register of information. Live at two EMIs in the Netherlands.",
  "SIEM cost": "teams cut SIEM ingest cost by 35% by routing low-value logs to cheap storage while keeping detections. Ahead of a Splunk renewal it's worth a look.",
  passkeys: "we rolled out FIDO2 passkeys to 3,000 staff at a German bank in 6 weeks, with recovery flows that don't flood the help-desk.",
  "generative AI data leakage": "we stop employees pasting customer data into ChatGPT and Copilot, with redaction in the browser and an AI-usage dashboard for the CISO.",
  "TLPT red teaming": "our TIBER-certified team runs threat-led penetration tests for DORA. We still have H1 2027 slots.",
  "ICT third-party risk": "we continuously monitor your ICT third parties and map them to the DORA register of information.",
  "secrets management": "we find and rotate leaked secrets across your repos and CI.",
  "phishing-resistant MFA": "we help regulated companies move from SMS/OTP to phishing-resistant MFA in one quarter.",
};

const authPass = (domain: string) => ({
  Name: "Authentication-Results",
  Value: `mx.postmarkapp.com; dkim=pass header.d=${domain} header.s=selector1; spf=pass smtp.mailfrom=${domain}; dmarc=pass (p=REJECT) header.from=${domain}`,
});

export function buildSamplePayload(
  key: SampleKey,
  exec: ExecProfile,
  override?: { name?: string; email?: string; subject?: string; body?: string },
  usedEmails: Set<string> = new Set(),
): PostmarkInboundPayload {
  const { s, email } = pickSender(usedEmails);
  const vendorName = override?.name || s.name;
  const vendorEmail = (override?.email || email).toLowerCase();
  const subject = override?.subject || `${s.company} x ${exec.companyName}: ${s.topic}`;
  const body =
    override?.body ||
    `Hi ${exec.fullName.split(" ")[0]},\n\nI'll keep this short: ${PITCH_BODY[s.topic]}\n\nWould you be open to a 20-minute call next week?\n\nBest,\n${vendorName}\n${s.company}`;
  const execDomain = exec.email.split("@")[1]!;
  const fwd = forwardingAddress(exec.aliasLocalPart, exec.aliasSecret);
  const alias = publicAlias(exec.aliasLocalPart);
  const id = `sim-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const date = new Date().toUTCString();

  const fromExec = {
    MessageID: id,
    From: exec.email,
    FromName: exec.fullName,
    FromFull: { Email: exec.email, Name: exec.fullName },
    To: fwd,
    ToFull: [{ Email: fwd, Name: "" }],
    OriginalRecipient: fwd,
    Date: date,
    Headers: [authPass(execDomain)],
  };

  switch (key) {
    case "gmail_forward":
      return {
        ...fromExec,
        Subject: `Fwd: ${subject}`,
        TextBody: `fyi\n\n---------- Forwarded message ---------\nFrom: ${vendorName} <${vendorEmail}>\nDate: ${date}\nSubject: ${subject}\nTo: <${exec.email}>\n\n\n${body}`,
      };
    case "outlook_fr_forward":
      return {
        ...fromExec,
        Subject: `TR: ${subject}`,
        TextBody: `\n\n________________________________\nDe : ${vendorName} <${vendorEmail}>\nEnvoyé : lundi 19 octobre 2026 08:41\nÀ : ${exec.fullName} <${exec.email}>\nObjet : ${subject}\n\n${body}`,
      };
    case "ios_forward":
      return {
        ...fromExec,
        Subject: `Fwd: ${subject}`,
        TextBody: `Sent from my iPhone\n\nBegin forwarded message:\n\n> From: ${vendorName} <${vendorEmail}>\n> Date: ${date}\n> To: ${exec.fullName} <${exec.email}>\n> Subject: ${subject}\n>\n${body
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n")}`,
      };
    case "rfc822_forward": {
      const eml = [`From: ${vendorName} <${vendorEmail}>`, `To: ${exec.fullName} <${exec.email}>`, `Subject: ${subject}`, `Date: ${date}`, "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");
      return {
        ...fromExec,
        Subject: `Fwd: ${subject}`,
        TextBody: "See attached.",
        Attachments: [{ Name: `${subject}.eml`, ContentType: "message/rfc822", Content: Buffer.from(eml).toString("base64") }],
      };
    }
    case "direct_alias":
      return {
        MessageID: id,
        From: vendorEmail,
        FromName: vendorName,
        FromFull: { Email: vendorEmail, Name: vendorName },
        To: alias,
        ToFull: [{ Email: alias, Name: exec.fullName }],
        OriginalRecipient: alias,
        Subject: subject,
        Date: date,
        Headers: [authPass(vendorEmail.split("@")[1]!)],
        TextBody: body,
      };
    case "ooo_reply":
      return {
        MessageID: id,
        From: vendorEmail,
        FromName: vendorName,
        FromFull: { Email: vendorEmail, Name: vendorName },
        To: alias,
        ToFull: [{ Email: alias, Name: "" }],
        OriginalRecipient: alias,
        Subject: `Automatic reply: ${subject}`,
        Date: date,
        Headers: [{ Name: "Auto-Submitted", Value: "auto-replied" }, { Name: "X-Auto-Response-Suppress", Value: "All" }],
        TextBody: "I am out of the office until Monday with limited access to email.",
      };
    case "spoofed_forward":
      return {
        ...fromExec,
        Headers: [{ Name: "Authentication-Results", Value: `mx.postmarkapp.com; dkim=none; spf=fail smtp.mailfrom=${execDomain}; dmarc=fail (p=REJECT) header.from=${execDomain}` }],
        Subject: `Fwd: ${subject}`,
        TextBody: `---------- Forwarded message ---------\nFrom: Random Person <someone@innocent-bystander.com>\nSubject: hi\n\nUse this service to spam me.`,
      };
    case "newsletter":
      return {
        MessageID: id,
        From: "news@security-roundup.com",
        FromName: "Security Roundup",
        FromFull: { Email: "news@security-roundup.com", Name: "Security Roundup" },
        To: alias,
        ToFull: [{ Email: alias, Name: "" }],
        OriginalRecipient: alias,
        Subject: "This week in security: 12 stories",
        Date: date,
        Headers: [{ Name: "List-Unsubscribe", Value: "<https://security-roundup.com/u/1>" }, { Name: "Precedence", Value: "bulk" }],
        TextBody: "Top stories this week… Unsubscribe | View in browser",
      };
  }
}
