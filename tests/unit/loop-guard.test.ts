import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PostmarkInboundPayload } from "@/lib/email/types";
import { checkLoopGuard } from "@/server/intake/loop-guard";

const load = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/inbound", name), "utf8")) as PostmarkInboundPayload;

describe("loop guard", () => {
  it("allows a normal cold email", () => {
    const p = load("direct-to-alias.json");
    expect(checkLoopGuard({ senderEmail: p.From, subject: p.Subject, headers: p.Headers })).toEqual({ allowed: true });
  });

  it("blocks OOO auto-replies via Auto-Submitted", () => {
    const p = load("ooo-autoreply.json");
    const r = checkLoopGuard({ senderEmail: p.From, subject: p.Subject, headers: p.Headers });
    expect(r).toMatchObject({ allowed: false, reason: "auto_submitted" });
  });

  it("blocks auto-reply subjects in several languages even without headers", () => {
    for (const subject of ["Automatic reply: hello", "Out of Office: back Monday", "Réponse automatique : absent", "Abwesenheitsnotiz", "Automatisch antwoord: afwezig", "Respuesta automática: fuera de la oficina"]) {
      expect(checkLoopGuard({ senderEmail: "a@b.com", subject })).toMatchObject({ allowed: false, reason: "autoreply_subject" });
    }
  });

  it("blocks bulk / list mail", () => {
    const p = load("newsletter-direct.json");
    const r = checkLoopGuard({ senderEmail: p.From, subject: p.Subject, headers: p.Headers });
    expect(r.allowed).toBe(false);
    expect(["bulk_precedence", "mailing_list"]).toContain((r as { reason: string }).reason);
  });

  it("blocks noreply-style senders", () => {
    for (const s of ["noreply@x.com", "no-reply@x.com", "do-not-reply@x.com", "mailer-daemon@x.com", "notifications@x.com"]) {
      expect(checkLoopGuard({ senderEmail: s })).toMatchObject({ allowed: false, reason: "noreply_sender" });
    }
  });

  it("allows Auto-Submitted: no", () => {
    expect(checkLoopGuard({ senderEmail: "a@b.com", headers: [{ Name: "Auto-Submitted", Value: "no" }] }).allowed).toBe(true);
  });

  it("rate-limits to one challenge per sender per exec per 30 days", () => {
    const now = new Date("2026-10-20T10:00:00Z");
    expect(checkLoopGuard({ senderEmail: "a@b.com", lastChallengeAt: "2026-10-01T10:00:00Z", now })).toMatchObject({ allowed: false, reason: "rate_limited" });
    expect(checkLoopGuard({ senderEmail: "a@b.com", lastChallengeAt: "2026-09-01T10:00:00Z", now }).allowed).toBe(true);
  });

  it("blocks suppressed senders and our own domains", () => {
    expect(checkLoopGuard({ senderEmail: "a@b.com", suppressed: true })).toMatchObject({ reason: "suppressed" });
    expect(checkLoopGuard({ senderEmail: "desk@mail.filtr.ai", ownDomains: ["filtr.ai"] })).toMatchObject({ reason: "own_domain" });
  });

  it("rejects invalid addresses", () => {
    expect(checkLoopGuard({ senderEmail: "not-an-email" })).toMatchObject({ reason: "invalid_sender" });
  });
});
