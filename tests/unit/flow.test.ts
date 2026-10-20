import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PostmarkInboundPayload } from "@/lib/email/types";

// Isolated demo store, no external keys: exercises the full demo-mode pipeline.
const storeFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gk-")), "store.json");
process.env.DEMO_STORE_PATH = storeFile;
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "POSTMARK_SERVER_TOKEN", "STRIPE_SECRET_KEY", "ANTHROPIC_API_KEY"]) delete process.env[k];

const load = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/inbound", name), "utf8")) as PostmarkInboundPayload;

const brief = {
  contactName: "Katrin Weber",
  companyName: "Logwerk",
  oneLiner: "We cut SIEM and SOC tooling cost by 30-40% by moving detections to your own data lake, ahead of a Splunk renewal.",
  acvBand: "50-100k",
  timeline: "this_quarter",
  compliance: ["ISO 27001", "GDPR DPA", "EU data residency"],
  proofUrl: "https://logwerk.de/case",
  proofText: "Migrated two German payment institutions off Splunk in 9 weeks; SIEM cost down 38% with the same detection coverage.",
} as const;

describe("end-to-end demo flow", () => {
  let mods: {
    handleInbound: typeof import("@/server/intake/handle-inbound").handleInbound;
    submitBrief: typeof import("@/server/pitches/submit-brief").submitBrief;
    acceptPitch: typeof import("@/server/pitches/decide").acceptPitch;
    createFastTrackCheckout: typeof import("@/server/payments/create-checkout").createFastTrackCheckout;
    completeDemoCheckout: typeof import("@/server/payments/create-checkout").completeDemoCheckout;
    enforceSla: typeof import("@/server/payments/sla").enforceSla;
    getRepo: typeof import("@/server/repo").getRepo;
  };

  beforeAll(async () => {
    mods = {
      ...(await import("@/server/intake/handle-inbound")),
      ...(await import("@/server/pitches/submit-brief")),
      ...(await import("@/server/pitches/decide")),
      ...(await import("@/server/payments/create-checkout")),
      ...(await import("@/server/payments/sla")),
      ...(await import("@/server/repo")),
    };
  });

  it("forward → challenge → free brief → scored → accept → vendor gets calendar link", async () => {
    const res = await mods.handleInbound(load("outlook-desktop-de.json"));
    expect(res.outcome).toBe("challenge_sent");
    const repo = mods.getRepo();
    const pitch = (await repo.getPitch(res.pitchId!))!;
    expect(pitch.status).toBe("challenged");
    const outbox = await repo.listOutbox(5);
    const challenge = outbox.find((e) => e.kind === "challenge" && e.pitchId === pitch.id)!;
    expect(challenge.to).toBe("k.weber@logwerk.de");
    expect(challenge.headers["Auto-Submitted"]).toBe("auto-replied");
    expect(challenge.replyTo).toMatch(/^r\+.+@in\.gatekeeperai\.app$/);
    expect(challenge.from).toContain("Vendor Desk");

    // Replaying the same Postmark message is a no-op
    expect((await mods.handleInbound(load("outlook-desktop-de.json"))).duplicate).toBe(true);

    const submitted = await mods.submitBrief(pitch.id, { ...brief, compliance: [...brief.compliance], choice: "free" });
    expect(submitted).toMatchObject({ ok: true, next: "submitted" });
    const after = (await repo.getPitch(pitch.id))!;
    expect(["surfaced", "filtered"]).toContain(after.status);
    const score = (await repo.getScore(pitch.id))!;
    expect(score.scorer).toBe("heuristic");
    expect(score.hardGates.passed).toBe(true);

    if (after.status === "filtered") await repo.updatePitch(pitch.id, { status: "surfaced" });
    const { bookingUrl } = await mods.acceptPitch(after.execId, pitch.id);
    expect(bookingUrl).toContain("cal.com");
    expect((await repo.getPitch(pitch.id))!.status).toBe("accepted");
    expect((await repo.listOutbox(3)).some((e) => e.kind === "pitch_accepted" && e.to === "k.weber@logwerk.de")).toBe(true);
  });

  it("fast-track: pay → surfaced with SLA → missed SLA → automatic refund", async () => {
    const res = await mods.handleInbound(load("outlook-es-forward.json"));
    expect(res.outcome).toBe("challenge_sent");
    const repo = mods.getRepo();
    const r = await mods.submitBrief(res.pitchId!, { ...brief, contactName: "Lucía Fernández", companyName: "Guardia IA", compliance: [...brief.compliance], choice: "fast_track" });
    expect(r).toMatchObject({ ok: true, next: "checkout" });
    expect((await repo.getPitch(res.pitchId!))!.status).toBe("awaiting_payment");

    const { url } = await mods.createFastTrackCheckout(res.pitchId!);
    const session = new URL(url, "http://x").searchParams.get("session")!;
    await mods.completeDemoCheckout(session);
    const paid = (await repo.getPitch(res.pitchId!))!;
    expect(paid.status).toBe("surfaced");
    expect(paid.fastTrack).toBe(true);
    expect(paid.slaDeadline).not.toBeNull();

    const result = await mods.enforceSla(new Date(Date.now() + 8 * 86_400_000));
    expect(result.refunded).toContain(res.pitchId);
    expect((await repo.getPitch(res.pitchId!))!.status).toBe("refunded");
    expect((await repo.getPaymentByPitch(res.pitchId!))!.status).toBe("refunded");
  });

  it("spoofed forwards and OOO replies contact nobody", async () => {
    const repo = mods.getRepo();
    const before = (await repo.listOutbox(500)).length;
    expect((await mods.handleInbound(load("spoofed-exec.json"))).outcome).toBe("dropped:spoofed_forward");
    expect((await mods.handleInbound({ ...load("ooo-autoreply.json"), To: "claire.dubois@in.gatekeeperai.app", ToFull: [{ Email: "claire.dubois@in.gatekeeperai.app" }], OriginalRecipient: "claire.dubois@in.gatekeeperai.app" })).outcome).toBe(
      "dropped:auto_submitted",
    );
    expect((await repo.listOutbox(500)).length).toBe(before);
  });
});
