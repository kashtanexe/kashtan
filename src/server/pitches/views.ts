import { getRepo } from "@/server/repo";
import type { PitchFilter } from "@/server/repo/types";
import type { Pitch, PitchView } from "@/types/domain";

export async function hydratePitch(pitch: Pitch): Promise<PitchView | null> {
  const repo = getRepo();
  const [vendor, contact, answers, score, decision, payment] = await Promise.all([
    repo.getVendor(pitch.vendorId),
    repo.getContact(pitch.contactId),
    repo.getAnswers(pitch.id),
    repo.getScore(pitch.id),
    repo.getDecision(pitch.id),
    repo.getPaymentByPitch(pitch.id),
  ]);
  if (!vendor || !contact) return null;
  return { pitch, vendor, contact, answers, score, decision, payment };
}

export async function getPitchView(id: string): Promise<PitchView | null> {
  const pitch = await getRepo().getPitch(id);
  return pitch ? hydratePitch(pitch) : null;
}

export async function listPitchViews(filter: PitchFilter): Promise<PitchView[]> {
  const pitches = await getRepo().listPitches(filter);
  const views = await Promise.all(pitches.map(hydratePitch));
  return views.filter((v): v is PitchView => Boolean(v));
}

/** Inbox ordering: fast-track by SLA first, then score. */
export function sortForInbox(views: PitchView[]): PitchView[] {
  return [...views].sort((a, b) => {
    if (a.pitch.fastTrack !== b.pitch.fastTrack) return a.pitch.fastTrack ? -1 : 1;
    if (a.pitch.fastTrack && b.pitch.fastTrack) return (a.pitch.slaDeadline ?? "").localeCompare(b.pitch.slaDeadline ?? "");
    return (b.score?.total ?? 0) - (a.score?.total ?? 0);
  });
}
