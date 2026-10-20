import { pitchAcceptedEmail } from "@emails/pitch-accepted";
import { pitchPassedEmail } from "@emails/pitch-passed";
import { buildBookingLink } from "@/lib/calendar";
import { deskFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { getRepo } from "@/server/repo";
import { PASS_REASONS, type PassReason } from "@/types/domain";
import { assertTransition } from "./state-machine";

export class DecisionError extends Error {}

async function load(execId: string, pitchId: string) {
  const repo = getRepo();
  const pitch = await repo.getPitch(pitchId);
  if (!pitch || pitch.execId !== execId) throw new DecisionError("Pitch not found");
  const exec = (await repo.getExec(execId))!;
  const contact = (await repo.getContact(pitch.contactId))!;
  const answers = await repo.getAnswers(pitchId);
  const vendor = (await repo.getVendor(pitch.vendorId))!;
  return { repo, pitch, exec, contact, answers, vendor };
}

export async function acceptPitch(execId: string, pitchId: string, note = "") {
  const { repo, pitch, exec, contact, answers, vendor } = await load(execId, pitchId);
  assertTransition(pitch.status, "accepted");
  const now = new Date().toISOString();
  await repo.saveDecision({ pitchId, execId, action: "accept", reasonCode: null, note, decidedAt: now });
  await repo.updatePitch(pitchId, { status: "accepted", decidedAt: now });
  const bookingUrl = buildBookingLink(exec.calendarUrl, {
    name: answers?.contactName || contact.name,
    email: contact.email,
    company: answers?.companyName || vendor.name,
  });
  const em = pitchAcceptedEmail({
    vendorFirstName: (answers?.contactName || contact.name).split(" ")[0]!,
    execFullName: exec.fullName,
    execFirstName: exec.fullName.split(" ")[0]!,
    bookingUrl,
  });
  await sendEmail({ kind: "pitch_accepted", to: contact.email, from: deskFrom(exec.fullName), subject: em.subject, html: em.html, text: em.text, pitchId, execId, stream: "challenges" });
  return { bookingUrl };
}

export async function passPitch(execId: string, pitchId: string, reason: PassReason, note = "") {
  const { repo, pitch, exec, contact, answers } = await load(execId, pitchId);
  assertTransition(pitch.status, "passed");
  const now = new Date().toISOString();
  await repo.saveDecision({ pitchId, execId, action: "pass", reasonCode: reason, note, decidedAt: now });
  await repo.updatePitch(pitchId, { status: "passed", decidedAt: now });
  const em = pitchPassedEmail({
    vendorFirstName: (answers?.contactName || contact.name).split(" ")[0]!,
    execFirstName: exec.fullName.split(" ")[0]!,
    reasonLabel: PASS_REASONS.find((r) => r.value === reason)?.label ?? "Not a fit right now",
  });
  await sendEmail({ kind: "pitch_passed", to: contact.email, from: deskFrom(exec.fullName), subject: em.subject, html: em.html, text: em.text, pitchId, execId, stream: "challenges" });
}

/** Exec rescues a filtered pitch from the audit view. */
export async function promotePitch(execId: string, pitchId: string) {
  const { repo, pitch } = await load(execId, pitchId);
  assertTransition(pitch.status, "surfaced");
  await repo.updatePitch(pitchId, { status: "surfaced" });
}
