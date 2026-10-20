import { challengeEmail } from "@emails/challenge";
import { vendorVerifyEmail } from "@emails/vendor-verify";
import { AUTO_REPLY_HEADERS, deskFrom, replyToForPitch } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { opaqueToken } from "@/lib/tokens";
import { formatEur } from "@/lib/utils";
import { getRepo } from "@/server/repo";
import { upsertVendor } from "@/server/vendors/upsert-vendor";
import type { ExecProfile, Pitch, PitchSource } from "@/types/domain";
import { briefUrl } from "./links";
import { assertTransition } from "./state-machine";

export interface CreatePitchInput {
  exec: ExecProfile;
  senderEmail: string;
  senderName: string;
  companyName?: string;
  source: PitchSource;
  subject: string;
  snippet: string;
  inboundEmailId?: string | null;
}

export async function createPitch(input: CreatePitchInput): Promise<Pitch> {
  const { vendor, contact } = await upsertVendor({ email: input.senderEmail, name: input.senderName, companyName: input.companyName });
  return getRepo().createPitch({
    execId: input.exec.id,
    vendorId: vendor.id,
    contactId: contact.id,
    source: input.source,
    status: "received",
    token: opaqueToken(),
    fastTrack: false,
    subject: input.subject.slice(0, 300),
    originalSnippet: input.snippet.slice(0, 600),
    inboundEmailId: input.inboundEmailId ?? null,
    slaDeadline: null,
    reminderSentAt: null,
    challengedAt: null,
    submittedAt: null,
    decidedAt: null,
  });
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

/** Send the challenge email to the original sender and move the pitch to `challenged`. */
export async function sendChallenge(pitch: Pitch, exec: ExecProfile): Promise<Pitch> {
  const repo = getRepo();
  const contact = await repo.getContact(pitch.contactId);
  if (!contact) throw new Error("contact missing");
  assertTransition(pitch.status, "challenged");
  const email = challengeEmail({
    execFirstName: firstName(exec.fullName),
    execTitle: exec.title,
    companyName: exec.companyName,
    vendorFirstName: firstName(contact.name),
    originalSubject: pitch.subject,
    briefUrl: briefUrl(pitch.id),
    fastTrackPrice: exec.fastTrackEnabled ? formatEur(exec.fastTrackPriceCents, exec.currency) : null,
  });
  await sendEmail({
    kind: "challenge",
    to: contact.email,
    from: deskFrom(exec.fullName),
    replyTo: replyToForPitch(pitch.token),
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: AUTO_REPLY_HEADERS,
    stream: "challenges",
    pitchId: pitch.id,
    execId: exec.id,
  });
  return repo.updatePitch(pitch.id, { status: "challenged", challengedAt: new Date().toISOString() });
}

/** Re-send the brief link when a vendor replies to the challenge instead of clicking. */
export async function resendChallenge(pitch: Pitch, exec: ExecProfile): Promise<void> {
  const contact = await getRepo().getContact(pitch.contactId);
  if (!contact) return;
  const email = challengeEmail({
    execFirstName: firstName(exec.fullName),
    execTitle: exec.title,
    companyName: exec.companyName,
    vendorFirstName: firstName(contact.name),
    originalSubject: pitch.subject,
    briefUrl: briefUrl(pitch.id),
    fastTrackPrice: exec.fastTrackEnabled ? formatEur(exec.fastTrackPriceCents, exec.currency) : null,
  });
  await sendEmail({
    kind: "challenge_resend",
    to: contact.email,
    from: deskFrom(exec.fullName),
    replyTo: replyToForPitch(pitch.token),
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: AUTO_REPLY_HEADERS,
    stream: "challenges",
    pitchId: pitch.id,
    execId: exec.id,
  });
}

/** "Pitch Me" link: vendor gives email + company, we email them a link to the brief. */
export async function startPitchFromLink(input: { exec: ExecProfile; email: string; name: string; company: string }) {
  const pitch = await createPitch({
    exec: input.exec,
    senderEmail: input.email,
    senderName: input.name,
    companyName: input.company,
    source: "link",
    subject: "Pitch via your GatekeeperAI link",
    snippet: "Submitted through the Pitch Me page.",
  });
  // Link pitches skip the cold-email challenge: the vendor came to us.
  const updated = await getRepo().updatePitch(pitch.id, { status: "challenged", challengedAt: new Date().toISOString() });
  const url = briefUrl(pitch.id);
  const email = vendorVerifyEmail({ vendorFirstName: firstName(input.name), execFirstName: firstName(input.exec.fullName), briefUrl: url });
  await sendEmail({
    kind: "vendor_verify",
    to: input.email,
    from: deskFrom(input.exec.fullName),
    replyTo: replyToForPitch(pitch.token),
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: AUTO_REPLY_HEADERS,
    stream: "challenges",
    pitchId: pitch.id,
    execId: input.exec.id,
  });
  return { pitch: updated, briefUrl: url };
}
