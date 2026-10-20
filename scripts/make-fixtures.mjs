// Generates tests/fixtures/inbound/*.json (real-shaped Postmark inbound payloads).
// Run: node scripts/make-fixtures.mjs
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("tests/fixtures/inbound");
fs.mkdirSync(dir, { recursive: true });

const EXEC = "claire.dubois@northwindpay.eu";
const FWD = "claire.dubois+k7f3q9@in.gatekeeperai.app";
const ALIAS = "claire.dubois@in.gatekeeperai.app";
const authPass = { Name: "Authentication-Results", Value: "mx.postmarkapp.com; dkim=pass header.d=northwindpay.eu header.s=selector1; spf=pass smtp.mailfrom=northwindpay.eu; dmarc=pass (p=REJECT sp=REJECT) header.from=northwindpay.eu" };

const base = (over) => ({
  FromName: "Claire Dubois",
  MessageStream: "inbound",
  From: EXEC,
  FromFull: { Email: EXEC, Name: "Claire Dubois", MailboxHash: "" },
  To: FWD,
  ToFull: [{ Email: FWD, Name: "", MailboxHash: "k7f3q9" }],
  Cc: "",
  CcFull: [],
  OriginalRecipient: FWD,
  ReplyTo: "",
  MailboxHash: "k7f3q9",
  Date: "Mon, 19 Oct 2026 09:14:02 +0200",
  HtmlBody: "",
  StrippedTextReply: "",
  Tag: "",
  Attachments: [],
  ...over,
});

const fixtures = {
  "outlook-desktop-fr.json": base({
    MessageID: "fx-outlook-fr-0001",
    Subject: "TR: Automatisation du registre DORA",
    Headers: [authPass, { Name: "X-Mailer", Value: "Microsoft Outlook 16.0" }],
    TextBody: `Peux-tu regarder ?\n\nClaire\n\n________________________________\nDe : Julien Moreau <julien.moreau@registra-conformite.fr>\nEnvoyé : lundi 19 octobre 2026 08:41\nÀ : Claire Dubois <claire.dubois@northwindpay.eu>\nObjet : Automatisation du registre DORA\n\nBonjour Claire,\n\nNous aidons les établissements de paiement à automatiser le registre d'information DORA. 20 minutes la semaine prochaine ?\n\nJulien`,
  }),
  "outlook-desktop-de.json": base({
    MessageID: "fx-outlook-de-0001",
    Subject: "WG: SIEM-Kosten halbieren",
    Headers: [authPass],
    TextBody: `FYI\n\n-----Ursprüngliche Nachricht-----\nVon: Katrin Weber [mailto:k.weber@logwerk.de]\nGesendet: Montag, 19. Oktober 2026 07:55\nAn: Dubois, Claire <claire.dubois@northwindpay.eu>\nBetreff: SIEM-Kosten halbieren\n\nHallo Frau Dubois,\n\nwir senken SIEM-Kosten um 40 %. Hätten Sie 15 Minuten?\n\nKatrin Weber`,
  }),
  "gmail-web-forward.json": base({
    MessageID: "fx-gmail-web-0001",
    Subject: "Fwd: Passkeys for 2,000 staff in 6 weeks",
    Headers: [authPass],
    TextBody: `worth a look?\n\n---------- Forwarded message ---------\nFrom: Ana Lima <ana.lima@keyward.io>\nDate: Mon, 19 Oct 2026 at 08:02\nSubject: Passkeys for 2,000 staff in 6 weeks\nTo: <claire.dubois@northwindpay.eu>\n\n\nHi Claire,\n\nWe rolled out passkeys to 4,800 staff at a Benelux bank in 7 weeks. Worth a 20 minute call next week?\n\nAna`,
    HtmlBody: `<div dir="ltr">worth a look?<br><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">---------- Forwarded message ---------<br>From: <strong class="gmail_sendername" dir="auto">Ana Lima</strong> <span dir="auto">&lt;<a href="mailto:ana.lima@keyward.io">ana.lima@keyward.io</a>&gt;</span><br>Date: Mon, 19 Oct 2026 at 08:02<br>Subject: Passkeys for 2,000 staff in 6 weeks<br>To: &lt;<a href="mailto:claire.dubois@northwindpay.eu">claire.dubois@northwindpay.eu</a>&gt;<br></div><br><br><div dir="ltr">Hi Claire,<br><br>We rolled out passkeys to 4,800 staff...</div></div></div>`,
  }),
  "gmail-nl-forward.json": base({
    MessageID: "fx-gmail-nl-0001",
    Subject: "Fwd: Red teaming onder DORA (TLPT)",
    Headers: [authPass],
    TextBody: `---------- Doorgestuurd bericht ---------\nVan: Erik Lund <erik.lund@northlight-sec.eu>\nDate: ma 19 okt 2026 om 08:30\nSubject: Red teaming onder DORA (TLPT)\nTo: <claire.dubois@northwindpay.eu>\n\nBeste Claire,\n\nWe hebben nog twee TLPT-slots in H1 2027.\n\nErik`,
  }),
  "outlook-es-forward.json": base({
    MessageID: "fx-outlook-es-0001",
    Subject: "RV: Gobernanza de IA generativa",
    Headers: [authPass],
    TextBody: `\n\n________________________________\nDe: Lucía Fernández <lucia.fernandez@guardia-ia.es>\nEnviado: lunes, 19 de octubre de 2026 9:02\nPara: Claire Dubois <claire.dubois@northwindpay.eu>\nAsunto: Gobernanza de IA generativa\n\nHola Claire,\n\n¿Tienes 15 minutos para hablar de fugas de datos en ChatGPT?\n\nLucía`,
  }),
  "ios-mail-forward.json": base({
    MessageID: "fx-ios-0001",
    Subject: "Fwd: Your Splunk renewal",
    Headers: [authPass, { Name: "X-Mailer", Value: "iPhone Mail (22A3354)" }],
    TextBody: `Sent from my iPhone\n\nBegin forwarded message:\n\n> From: Priya Raman <priya.raman@driftwood-analytics.com>\n> Date: 19 October 2026 at 07:12:44 CEST\n> To: Claire Dubois <claire.dubois@northwindpay.eu>\n> Subject: Your Splunk renewal\n>\n> Hi Claire, before your Splunk renewal, worth seeing how teams cut ingest cost 40%? Quick call Thursday?\n>\n> Priya`,
  }),
  "rfc822-attachment.json": base({
    MessageID: "fx-rfc822-0001",
    Subject: "Fwd: Browser DLP for GenAI",
    Headers: [authPass],
    TextBody: "See attached.",
    Attachments: [
      {
        Name: "Browser DLP for GenAI.eml",
        ContentType: "message/rfc822",
        ContentLength: 0,
        Content: Buffer.from(
          [
            "Return-Path: <tom@veilgate.ai>",
            "From: =?UTF-8?B?VG9tIEhhcnRsZXk=?= <tom@veilgate.ai>",
            "To: Claire Dubois <claire.dubois@northwindpay.eu>",
            "Subject: Browser DLP for GenAI",
            "Date: Mon, 19 Oct 2026 06:58:00 +0000",
            "Message-ID: <abc123@veilgate.ai>",
            "MIME-Version: 1.0",
            'Content-Type: multipart/alternative; boundary="b1"',
            "",
            "--b1",
            "Content-Type: text/plain; charset=utf-8",
            "Content-Transfer-Encoding: quoted-printable",
            "",
            "Hi Claire, 1 in 5 employees paste customer data into public LLMs. We redact it in the browser =",
            "before it leaves. 15 minutes?",
            "--b1",
            "Content-Type: text/html; charset=utf-8",
            "",
            "<p>Hi Claire</p>",
            "--b1--",
            "",
          ].join("\r\n"),
        ).toString("base64"),
      },
    ],
  }),
  "direct-to-alias.json": base({
    MessageID: "fx-direct-0001",
    From: "laura.chen@atlasendpoint.com",
    FromName: "Laura Chen",
    FromFull: { Email: "laura.chen@atlasendpoint.com", Name: "Laura Chen" },
    To: ALIAS,
    ToFull: [{ Email: ALIAS, Name: "Claire Dubois" }],
    OriginalRecipient: ALIAS,
    MailboxHash: "",
    Subject: "EDR consolidation: 15 minutes?",
    Headers: [{ Name: "Authentication-Results", Value: "mx.postmarkapp.com; dkim=pass header.d=atlasendpoint.com; dmarc=pass header.from=atlasendpoint.com" }],
    TextBody: "Hi Claire, teams like yours consolidated three endpoint agents into one and cut cost 30%. Would you be open to a 15 minute call next week?\n\nLaura",
  }),
  "ooo-autoreply.json": base({
    MessageID: "fx-ooo-0001",
    From: "sam.oneill@gridline.net",
    FromName: "Sam O'Neill",
    FromFull: { Email: "sam.oneill@gridline.net", Name: "Sam O'Neill" },
    To: "r+tok_gridline@in.gatekeeperai.app",
    ToFull: [{ Email: "r+tok_gridline@in.gatekeeperai.app", Name: "" }],
    OriginalRecipient: "r+tok_gridline@in.gatekeeperai.app",
    MailboxHash: "tok_gridline",
    Subject: "Automatic reply: Re: Zero-trust network access for hybrid teams",
    Headers: [
      { Name: "Auto-Submitted", Value: "auto-replied" },
      { Name: "X-Auto-Response-Suppress", Value: "All" },
    ],
    TextBody: "I am out of the office until 26 October with limited access to email.",
  }),
  "spoofed-exec.json": base({
    MessageID: "fx-spoof-0001",
    Subject: "Fwd: please contact",
    Headers: [{ Name: "Authentication-Results", Value: "mx.postmarkapp.com; dkim=none; spf=fail smtp.mailfrom=northwindpay.eu; dmarc=fail (p=REJECT) header.from=northwindpay.eu" }],
    TextBody: "---------- Forwarded message ---------\nFrom: Victim <victim@innocent-company.com>\nSubject: hello\n\nSpam relay attempt.",
  }),
  "newsletter-direct.json": base({
    MessageID: "fx-news-0001",
    From: "news@securityweekly-digest.com",
    FromFull: { Email: "news@securityweekly-digest.com", Name: "Security Weekly" },
    To: ALIAS,
    ToFull: [{ Email: ALIAS, Name: "" }],
    OriginalRecipient: ALIAS,
    MailboxHash: "",
    Subject: "This week in security",
    Headers: [{ Name: "List-Unsubscribe", Value: "<https://securityweekly-digest.com/u/123>" }, { Name: "Precedence", Value: "bulk" }],
    TextBody: "Top stories this week... Unsubscribe | View in browser",
  }),
};

for (const [name, data] of Object.entries(fixtures)) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + "\n");
}
console.log(`wrote ${Object.keys(fixtures).length} fixtures to ${dir}`);
