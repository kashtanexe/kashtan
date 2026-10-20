import type { PitchStatus } from "@/types/domain";

/**
 * Single source of truth for pitch lifecycle transitions.
 *
 * received → challenged → brief_submitted → (awaiting_payment) → scoring → surfaced | filtered
 *   surfaced/filtered → accepted | passed ; surfaced → expired (→ refunded)
 */
export const TRANSITIONS: Record<PitchStatus, readonly PitchStatus[]> = {
  received: ["challenged", "filtered"],
  challenged: ["brief_submitted", "expired"],
  brief_submitted: ["awaiting_payment", "scoring"],
  awaiting_payment: ["scoring", "brief_submitted", "expired"],
  scoring: ["surfaced", "filtered"],
  surfaced: ["accepted", "passed", "expired"],
  filtered: ["surfaced", "accepted", "passed"],
  accepted: [],
  passed: [],
  expired: ["refunded"],
  refunded: [],
} as const;

export const TERMINAL: readonly PitchStatus[] = ["accepted", "passed", "refunded"];

export function canTransition(from: PitchStatus, to: PitchStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: PitchStatus,
    public readonly to: PitchStatus,
  ) {
    super(`Invalid pitch transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: PitchStatus, to: PitchStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Apply a sequence of transitions, e.g. brief_submitted → scoring → surfaced. Returns the final state. */
export function walk(from: PitchStatus, path: PitchStatus[]): PitchStatus {
  let cur = from;
  for (const next of path) {
    assertTransition(cur, next);
    cur = next;
  }
  return cur;
}

export function isTerminal(s: PitchStatus): boolean {
  return TERMINAL.includes(s);
}

export function isAwaitingExec(s: PitchStatus): boolean {
  return s === "surfaced";
}

export const STATUS_LABEL: Record<PitchStatus, string> = {
  received: "Received",
  challenged: "Challenge sent",
  brief_submitted: "Brief submitted",
  awaiting_payment: "Awaiting payment",
  scoring: "Scoring",
  surfaced: "In inbox",
  filtered: "Filtered",
  accepted: "Accepted",
  passed: "Passed",
  expired: "Expired",
  refunded: "Refunded",
};
