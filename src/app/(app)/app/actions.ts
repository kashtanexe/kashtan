"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { digestFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { isDemoMode } from "@/lib/env";
import { slugify } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { recordDigestSent, renderDigestForExec } from "@/server/digest/build-digest";
import { handleInbound } from "@/server/intake/handle-inbound";
import { buildSamplePayload, SAMPLE_KEYS, type SampleKey } from "@/server/intake/samples";
import { enforceSla } from "@/server/payments/sla";
import { acceptPitch, passPitch, promotePitch } from "@/server/pitches/decide";
import { getRepo } from "@/server/repo";
import { COMPLIANCE_OPTIONS, PASS_REASONS, type PassReason } from "@/types/domain";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const lines = (s: string) =>
  s
    .split(/\n|,/)
    .map((x) => x.trim())
    .filter(Boolean);

// --- Decisions -----------------------------------------------------------------

export async function acceptAction(formData: FormData) {
  const exec = await getCurrentExec();
  const pitchId = str(formData, "pitchId");
  await acceptPitch(exec.id, pitchId);
  revalidatePath("/app", "layout");
  redirect(`/app/pitches/${pitchId}?decided=accepted`);
}

export async function passAction(formData: FormData) {
  const exec = await getCurrentExec();
  const pitchId = str(formData, "pitchId");
  const reason = str(formData, "reason") as PassReason;
  if (!PASS_REASONS.some((r) => r.value === reason)) throw new Error("Unknown reason");
  await passPitch(exec.id, pitchId, reason, str(formData, "note"));
  revalidatePath("/app", "layout");
  const back = str(formData, "back");
  redirect(back === "inbox" ? "/app?decided=passed" : `/app/pitches/${pitchId}?decided=passed`);
}

export async function promoteAction(formData: FormData) {
  const exec = await getCurrentExec();
  const pitchId = str(formData, "pitchId");
  await promotePitch(exec.id, pitchId);
  revalidatePath("/app", "layout");
  redirect(`/app/pitches/${pitchId}`);
}

// --- Settings & onboarding --------------------------------------------------------

export async function saveSettingsAction(formData: FormData) {
  const exec = await getCurrentExec();
  const threshold = Math.max(40, Math.min(99, Number(str(formData, "threshold")) || 85));
  const cap = Math.max(1, Math.min(10, Number(str(formData, "autoUnlockDailyCap")) || 2));
  const calendarUrl = str(formData, "calendarUrl");
  if (calendarUrl && !/^https:\/\/\S+$/.test(calendarUrl)) redirect("/app/settings?error=calendar");
  await getRepo().updateExec(exec.id, {
    threshold,
    autoUnlock: formData.get("autoUnlock") === "on",
    autoUnlockDailyCap: cap,
    calendarUrl,
    timezone: str(formData, "timezone") || exec.timezone,
  });
  revalidatePath("/app", "layout");
  redirect("/app/settings?saved=1");
}

export async function saveFastTrackAction(formData: FormData) {
  const exec = await getCurrentExec();
  const euros = Math.max(10, Math.min(500, Number(str(formData, "price")) || 30));
  await getRepo().updateExec(exec.id, {
    fastTrackEnabled: formData.get("fastTrackEnabled") === "on",
    fastTrackPriceCents: Math.round(euros * 100),
    charityEnabled: formData.get("charityEnabled") === "on",
    charityName: str(formData, "charityName"),
  });
  revalidatePath("/app", "layout");
  redirect("/app/settings/fast-track?saved=1");
}

const PrioritiesSchema = z.object({
  quarter: z.string().min(2).max(40),
  priorities: z.array(z.string().min(3).max(300)).min(1).max(8),
  narrative: z.string().max(2000),
  budgetMinEur: z.number().int().min(0),
  budgetMaxEur: z.number().int().min(0),
  requiredCompliance: z.array(z.enum(COMPLIANCE_OPTIONS)),
  dealbreakers: z.array(z.string().min(2).max(60)).max(30),
});

export async function savePrioritiesAction(formData: FormData) {
  const exec = await getCurrentExec();
  const parsed = PrioritiesSchema.safeParse({
    quarter: str(formData, "quarter"),
    priorities: formData
      .getAll("priority")
      .map((v) => String(v).trim())
      .filter(Boolean),
    narrative: str(formData, "narrative"),
    budgetMinEur: Number(str(formData, "budgetMinEur")) || 0,
    budgetMaxEur: Number(str(formData, "budgetMaxEur")) || 0,
    requiredCompliance: formData.getAll("requiredCompliance").map(String),
    dealbreakers: lines(str(formData, "dealbreakers")),
  });
  const back = str(formData, "back") || "/app/settings/priorities";
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  await getRepo().savePriorities(exec.id, parsed.data);
  revalidatePath("/app", "layout");
  redirect(`${back}?saved=1`);
}

export async function saveProfileAction(formData: FormData) {
  const exec = await getCurrentExec();
  const repo = getRepo();
  const slug = slugify(str(formData, "slug") || exec.slug);
  if (slug !== exec.slug && (await repo.getExecBySlug(slug))) redirect("/app/onboarding/profile?error=slug");
  await repo.updateExec(exec.id, {
    fullName: str(formData, "fullName") || exec.fullName,
    title: str(formData, "title"),
    companyName: str(formData, "companyName"),
    companySize: str(formData, "companySize"),
    timezone: str(formData, "timezone") || exec.timezone,
    bio: str(formData, "bio").slice(0, 400),
    slug,
  });
  revalidatePath("/app", "layout");
  redirect("/app/onboarding/priorities");
}

export async function saveIntakeAction(formData: FormData) {
  const exec = await getCurrentExec();
  const alias = str(formData, "aliasLocalPart").toLowerCase().replace(/[^a-z0-9.-]/g, "");
  const addresses = lines(str(formData, "verifiedAddresses")).map((a) => a.toLowerCase());
  const repo = getRepo();
  const other = alias ? await repo.getExecByAlias(alias) : null;
  if (other && other.id !== exec.id) redirect("/app/onboarding/intake?error=alias");
  await repo.updateExec(exec.id, {
    aliasLocalPart: alias || exec.aliasLocalPart,
    verifiedAddresses: addresses.length > 0 ? addresses : exec.verifiedAddresses,
    onboardedAt: exec.onboardedAt ?? new Date().toISOString(),
  });
  revalidatePath("/app", "layout");
  redirect("/app/onboarding/intake?saved=1");
}

// --- Demo helpers -------------------------------------------------------------------

export async function simulateInboundAction(formData: FormData) {
  const exec = await getCurrentExec();
  const key = str(formData, "sample") as SampleKey;
  if (!SAMPLE_KEYS.includes(key)) throw new Error("Unknown sample");
  const repo = getRepo();
  const mine = await repo.listPitches({ execId: exec.id });
  const used = new Set((await Promise.all(mine.map((p) => repo.getContact(p.contactId)))).map((c) => c?.email ?? ""));
  const payload = buildSamplePayload(
    key,
    exec,
    {
      name: str(formData, "vendorName") || undefined,
      email: str(formData, "vendorEmail") || undefined,
      subject: str(formData, "subject") || undefined,
      body: str(formData, "body") || undefined,
    },
    used,
  );
  const result = await handleInbound(payload);
  revalidatePath("/app", "layout");
  const qs = new URLSearchParams({ sample: key, outcome: result.outcome, detail: result.detail, ...(result.pitchId ? { pitch: result.pitchId } : {}) });
  redirect(`/app/simulate?${qs.toString()}`);
}

export async function sendDigestNowAction() {
  const exec = await getCurrentExec();
  const { data, email } = await renderDigestForExec(exec);
  await sendEmail({ kind: "weekly_digest", to: exec.email, from: digestFrom(), subject: email.subject, html: email.html, text: email.text, execId: exec.id, stream: "digests" });
  await recordDigestSent(exec, { ...data.stats });
  revalidatePath("/app", "layout");
  redirect("/app/outbox?sent=digest");
}

/** Demo: pretend 7 days passed on a fast-track pitch and run the SLA enforcer. */
export async function fastForwardSlaAction(formData: FormData) {
  if (!isDemoMode()) throw new Error("Demo only");
  const exec = await getCurrentExec();
  const pitchId = str(formData, "pitchId");
  const repo = getRepo();
  const pitch = await repo.getPitch(pitchId);
  if (!pitch || pitch.execId !== exec.id) throw new Error("Not found");
  const payment = await repo.getPaymentByPitch(pitchId);
  const past = new Date(Date.now() - 60_000).toISOString();
  if (payment) await repo.updatePayment(payment.id, { slaDeadline: past });
  await repo.updatePitch(pitchId, { slaDeadline: past });
  await enforceSla();
  revalidatePath("/app", "layout");
  redirect(`/app/pitches/${pitchId}`);
}

export async function resetDemoAction() {
  if (!isDemoMode()) throw new Error("Demo only");
  await getRepo().reset?.();
  revalidatePath("/", "layout");
  redirect("/app?reset=1");
}
