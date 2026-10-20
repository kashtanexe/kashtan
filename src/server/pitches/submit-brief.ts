import { z } from "zod";
import { execNewCardEmail } from "@emails/exec-new-card";
import { pitchReceivedEmail } from "@emails/pitch-received";
import { digestFrom, deskFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { formatDate, relativeTime } from "@/lib/utils";
import { getRepo } from "@/server/repo";
import { scorePitch } from "@/server/scoring/score-pitch";
import { decideOutcome } from "@/server/scoring/threshold";
import { ACV_BANDS, COMPLIANCE_OPTIONS, TIMELINES, type ExecProfile, type Pitch, type PitchScore } from "@/types/domain";
import { acceptPitch } from "./decide";
import { acceptActionUrl, cardUrl, passActionUrls, statusUrl } from "./links";
import { assertTransition, canTransition } from "./state-machine";

export const BriefSchema = z.object({
  contactName: z.string().trim().min(2, "Your name, please").max(80),
  companyName: z.string().trim().min(2, "Company name, please").max(80),
  oneLiner: z.string().trim().min(20, "At least 20 characters").max(140, "140 characters max"),
  acvBand: z.enum(ACV_BANDS.map((b) => b.value) as [string, ...string[]]),
  timeline: z.enum(TIMELINES.map((t) => t.value) as [string, ...string[]]),
  compliance: z.array(z.enum(COMPLIANCE_OPTIONS)).max(COMPLIANCE_OPTIONS.length),
  proofUrl: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/.test(v), "Must be a full https:// link"),
  proofText: z.string().trim().min(20, "Give us one concrete proof point").max(600),
  choice: z.enum(["free", "fast_track"]),
});

export type BriefInput = z.infer<typeof BriefSchema>;

export type SubmitResult =
  | { ok: true; next: "submitted"; outcome: Pitch["status"] }
  | { ok: true; next: "checkout"; pitchId: string }
  | { ok: false; error: string };

export async function submitBrief(pitchId: string, input: BriefInput): Promise<SubmitResult> {
  const repo = getRepo();
  const pitch = await repo.getPitch(pitchId);
  if (!pitch) return { ok: false, error: "Pitch not found" };
  if (!["challenged", "received", "awaiting_payment"].includes(pitch.status)) {
    return { ok: false, error: "This brief has already been submitted." };
  }
  const exec = await repo.getExec(pitch.execId);
  if (!exec) return { ok: false, error: "Executive not found" };

  await repo.saveAnswers({
    pitchId,
    contactName: input.contactName,
    companyName: input.companyName,
    oneLiner: input.oneLiner,
    acvBand: input.acvBand as never,
    timeline: input.timeline as never,
    compliance: input.compliance,
    proofUrl: input.proofUrl,
    proofText: input.proofText,
    createdAt: new Date().toISOString(),
  });

  let current = pitch;
  if (current.status === "received") current = await repo.updatePitch(pitchId, { status: "challenged" });
  if (current.status === "challenged") {
    current = await repo.updatePitch(pitchId, { status: "brief_submitted", submittedAt: new Date().toISOString() });
  }

  const wantsFastTrack = input.choice === "fast_track" && exec.fastTrackEnabled;
  if (wantsFastTrack) {
    if (current.status !== "awaiting_payment") {
      assertTransition(current.status, "awaiting_payment");
      await repo.updatePitch(pitchId, { status: "awaiting_payment" });
    }
    return { ok: true, next: "checkout", pitchId };
  }
  if (current.status === "awaiting_payment") {
    // Vendor switched back to free
    current = await repo.updatePitch(pitchId, { status: "brief_submitted" });
  }

  const outcome = await runScoring(pitchId, { fastTrackPaid: false });
  return { ok: true, next: "submitted", outcome };
}

/** brief_submitted|awaiting_payment → scoring → surfaced|filtered, with notifications. */
export async function runScoring(pitchId: string, opts: { fastTrackPaid: boolean }): Promise<Pitch["status"]> {
  const repo = getRepo();
  let pitch = (await repo.getPitch(pitchId))!;
  const exec = (await repo.getExec(pitch.execId))!;
  const answers = await repo.getAnswers(pitchId);
  const priorities = await repo.getCurrentPriorities(exec.id);
  if (!answers || !priorities) throw new Error("Cannot score without answers and priorities");

  assertTransition(pitch.status, "scoring");
  pitch = await repo.updatePitch(pitchId, { status: "scoring" });

  const score = await scorePitch({
    pitchId,
    exec,
    priorities,
    answers,
    originalEmail: pitch.originalSnippet,
  });
  await repo.saveScore(score);

  const outcome = decideOutcome(score, exec.threshold, opts.fastTrackPaid);
  pitch = await repo.updatePitch(pitchId, { status: outcome });

  const contact = await repo.getContact(pitch.contactId);
  if (contact) {
    const em = pitchReceivedEmail({
      vendorFirstName: answers.contactName.split(" ")[0] ?? "there",
      execFirstName: exec.fullName.split(" ")[0]!,
      fastTrack: pitch.fastTrack,
      slaDate: pitch.slaDeadline ? formatDate(pitch.slaDeadline, exec.timezone) : null,
      statusUrl: statusUrl(pitchId),
    });
    await sendEmail({ kind: "pitch_received", to: contact.email, from: deskFrom(exec.fullName), subject: em.subject, html: em.html, text: em.text, pitchId, execId: exec.id, stream: "challenges" });
  }

  if (outcome === "surfaced") {
    await notifyExec(exec, pitch, score, answers.companyName, answers.oneLiner, answers.compliance);
    await maybeAutoUnlock(exec, pitch, score);
  }
  return (await repo.getPitch(pitchId))!.status;
}

async function notifyExec(exec: ExecProfile, pitch: Pitch, score: PitchScore, company: string, oneLiner: string, compliance: string[]) {
  // Instant alert only for fast-track or high matches; everything else waits for Friday.
  if (!pitch.fastTrack && score.total < exec.threshold) return;
  const em = execNewCardEmail({
    execFirstName: exec.fullName.split(" ")[0]!,
    company,
    oneLiner,
    score: score.total,
    tldr: score.tldr,
    badges: compliance,
    fastTrack: pitch.fastTrack,
    slaText: pitch.slaDeadline ? `(SLA ${relativeTime(pitch.slaDeadline)})` : null,
    cardUrl: cardUrl(pitch.id),
    acceptUrl: acceptActionUrl(pitch.id),
    passUrls: passActionUrls(pitch.id),
  });
  await sendEmail({ kind: "exec_new_card", to: exec.email, from: digestFrom(), subject: em.subject, html: em.html, text: em.text, pitchId: pitch.id, execId: exec.id, stream: "digests" });
}

/** Optional, off by default: auto-accept very high matches, capped per day. */
async function maybeAutoUnlock(exec: ExecProfile, pitch: Pitch, score: PitchScore) {
  if (!exec.autoUnlock || !score.hardGates.passed || score.injectionSuspected || score.total < exec.threshold) return;
  const decisions = await getRepo().listDecisions(exec.id);
  const since = Date.now() - 86_400_000;
  const today = decisions.filter((d) => d.action === "accept" && new Date(d.decidedAt).getTime() > since && d.note === "auto-unlock").length;
  if (today >= exec.autoUnlockDailyCap) return;
  if (canTransition(pitch.status, "accepted")) await acceptPitch(exec.id, pitch.id, "auto-unlock");
}
