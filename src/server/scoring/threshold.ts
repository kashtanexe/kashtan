import type { PitchScore } from "@/types/domain";

export const DEFAULT_THRESHOLD = 85;

/** surfaced = becomes a Baseball Card. Paid Fast-Track always gets human review. */
export function decideOutcome(score: Pick<PitchScore, "total" | "hardGates">, threshold: number, fastTrackPaid: boolean): "surfaced" | "filtered" {
  if (fastTrackPaid) return "surfaced";
  if (!score.hardGates.passed) return "filtered";
  return score.total >= threshold ? "surfaced" : "filtered";
}

/**
 * Suggest a threshold that would have produced ~targetPerWeek cards over the scored history.
 * LLM scores aren't calibrated, so the threshold is tuned per exec from their own volume.
 */
export function suggestThreshold(totals: number[], weeks: number, targetPerWeek = 2): number {
  if (totals.length === 0 || weeks <= 0) return DEFAULT_THRESHOLD;
  const sorted = [...totals].sort((a, b) => b - a);
  const k = Math.max(1, Math.round(targetPerWeek * weeks));
  const idx = Math.min(sorted.length - 1, k - 1);
  return Math.max(60, Math.min(95, sorted[idx]!));
}
