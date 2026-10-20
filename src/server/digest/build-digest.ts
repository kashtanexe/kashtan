import { weeklyDigestEmail, type DigestData } from "@emails/weekly-digest";
import { appUrl } from "@/lib/env";
import { getRepo } from "@/server/repo";
import { listPitchViews, sortForInbox } from "@/server/pitches/views";
import { acceptActionUrl, cardUrl } from "@/server/pitches/links";
import type { ExecProfile } from "@/types/domain";
import { weekKey } from "./select-due-execs";

const WEEK_MS = 7 * 86_400_000;

export async function buildDigest(exec: ExecProfile, now = new Date()): Promise<DigestData> {
  const since = now.getTime() - WEEK_MS;
  const all = await listPitchViews({ execId: exec.id });
  const inWeek = (iso: string | null) => Boolean(iso && new Date(iso).getTime() >= since);
  const week = all.filter((v) => inWeek(v.pitch.createdAt) || inWeek(v.pitch.updatedAt));

  const count = (pred: (v: (typeof all)[number]) => boolean) => week.filter(pred).length;
  const received = all.filter((v) => inWeek(v.pitch.createdAt)).length;
  const submitted = all.filter((v) => inWeek(v.pitch.submittedAt)).length;
  const filtered = count((v) => v.pitch.status === "filtered");
  const accepted = all.filter((v) => v.decision?.action === "accept" && inWeek(v.decision.decidedAt)).length;
  const passed = all.filter((v) => v.decision?.action === "pass" && inWeek(v.decision.decidedAt)).length;
  const fastTrackRevenueCents = all
    .filter((v) => v.payment && v.payment.status === "paid" && inWeek(v.payment.paidAt))
    .reduce((s, v) => s + (v.payment?.amountCents ?? 0), 0);

  const waiting = sortForInbox(all.filter((v) => v.pitch.status === "surfaced"));
  const minutesSaved = Math.round(received * 4 + filtered * 3);

  return {
    execFirstName: exec.fullName.split(" ")[0]!,
    weekLabel: weekKey(now, exec.timezone),
    stats: { received, submitted, surfaced: waiting.length, filtered, accepted, passed, minutesSaved, fastTrackRevenueCents },
    cards: waiting.slice(0, 5).map((v) => ({
      company: v.answers?.companyName ?? v.vendor.name,
      oneLiner: v.answers?.oneLiner ?? v.pitch.subject,
      score: v.score?.total ?? 0,
      tldr: v.score?.tldr ?? [],
      badges: v.answers?.compliance ?? [],
      fastTrack: v.pitch.fastTrack,
      slaDeadline: v.pitch.slaDeadline,
      cardUrl: cardUrl(v.pitch.id),
      acceptUrl: acceptActionUrl(v.pitch.id),
    })),
    filteredSample: all
      .filter((v) => v.pitch.status === "filtered" && inWeek(v.pitch.updatedAt))
      .slice(0, 5)
      .map((v) => ({ company: v.answers?.companyName ?? v.vendor.name, reason: v.score?.hardGates.failures[0]?.detail ?? `Score ${v.score?.total ?? "n/a"}` })),
    inboxUrl: `${appUrl()}/app`,
    filteredUrl: `${appUrl()}/app/filtered`,
    timezone: exec.timezone,
  };
}

export async function renderDigestForExec(exec: ExecProfile, now = new Date()) {
  const data = await buildDigest(exec, now);
  return { data, email: weeklyDigestEmail(data) };
}

export async function recordDigestSent(exec: ExecProfile, stats: Record<string, number>, now = new Date()) {
  return getRepo().saveDigestRun({ execId: exec.id, weekKey: weekKey(now, exec.timezone), sentAt: now.toISOString(), stats });
}
