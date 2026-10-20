import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PostmarkInboundPayload } from "@/lib/email/types";
import { extractOriginalSender, parseAddress, MIN_CONFIDENCE } from "@/server/intake/extract-original-sender";

const load = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/inbound", name), "utf8")) as PostmarkInboundPayload;

const opts = {
  excludeAddresses: ["claire.dubois@northwindpay.eu", "c.dubois@northwindpay.eu"],
  excludeDomains: ["in.filtr.ai", "mail.filtr.ai"],
};

describe("extractOriginalSender: fixtures per mail client", () => {
  const cases: [string, string, string, string, string | undefined][] = [
    ["outlook-desktop-fr.json", "julien.moreau@registra-conformite.fr", "Julien Moreau", "Automatisation du registre DORA", "fr"],
    ["outlook-desktop-de.json", "k.weber@logwerk.de", "Katrin Weber", "SIEM-Kosten halbieren", "de"],
    ["gmail-web-forward.json", "ana.lima@keyward.io", "Ana Lima", "Passkeys for 2,000 staff in 6 weeks", "en"],
    ["gmail-nl-forward.json", "erik.lund@northlight-sec.eu", "Erik Lund", "Red teaming onder DORA (TLPT)", "nl"],
    ["outlook-es-forward.json", "lucia.fernandez@guardia-ia.es", "Lucía Fernández", "Gobernanza de IA generativa", "es"],
    ["ios-mail-forward.json", "priya.raman@driftwood-analytics.com", "Priya Raman", "Your Splunk renewal", "en"],
  ];

  for (const [file, email, name, subject, locale] of cases) {
    it(`parses ${file}`, () => {
      const r = extractOriginalSender(load(file), opts);
      expect(r.method).toBe("header_block");
      expect(r.email).toBe(email);
      expect(r.name).toBe(name);
      expect(r.subject).toBe(subject);
      expect(r.locale).toBe(locale);
      expect(r.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
      expect(r.body.length).toBeGreaterThan(10);
    });
  }

  it("prefers the message/rfc822 attachment and decodes encoded-words + quoted-printable", () => {
    const r = extractOriginalSender(load("rfc822-attachment.json"), opts);
    expect(r.method).toBe("rfc822");
    expect(r.email).toBe("tom@veilgate.ai");
    expect(r.name).toBe("Tom Hartley");
    expect(r.subject).toBe("Browser DLP for GenAI");
    expect(r.body).toContain("redact it in the browser before it leaves");
    expect(r.headers?.some((h) => h.Name === "Message-ID")).toBe(true);
    expect(r.confidence).toBeGreaterThan(0.95);
  });

  it("falls back to the HTML body when the text part has no header block", () => {
    const p = load("gmail-web-forward.json");
    const r = extractOriginalSender({ ...p, TextBody: "" }, opts);
    expect(r.email).toBe("ana.lima@keyward.io");
    expect(r.name).toBe("Ana Lima");
  });

  it("never returns the exec's own address", () => {
    const r = extractOriginalSender(
      { MessageID: "x", From: "claire.dubois@northwindpay.eu", TextBody: "From: Claire Dubois <claire.dubois@northwindpay.eu>\nSubject: note to self" },
      opts,
    );
    expect(r.email).toBeNull();
    expect(r.method).toBe("none");
  });

  it("uses a low-confidence loose scan when there is no header block", () => {
    const r = extractOriginalSender({ MessageID: "x", From: "claire.dubois@northwindpay.eu", Subject: "Fwd: hi", TextBody: "Ping me at bob@vendor.io thanks" }, opts);
    expect(r.method).toBe("fallback");
    expect(r.email).toBe("bob@vendor.io");
    expect(r.confidence).toBeLessThan(MIN_CONFIDENCE);
  });
});

describe("parseAddress", () => {
  it.each([
    ["Jane Doe <jane@acme.com>", "jane@acme.com", "Jane Doe"],
    ['"Doe, Jane" <jane@acme.com>', "jane@acme.com", "Doe, Jane"],
    ["Jane Doe [mailto:jane@acme.com]", "jane@acme.com", "Jane Doe"],
    ["jane@acme.com", "jane@acme.com", "jane"],
    ["**Jane Doe** <JANE@ACME.COM>", "jane@acme.com", "Jane Doe"],
  ])("%s", (input, email, name) => {
    expect(parseAddress(input)).toEqual({ email, name });
  });
});
