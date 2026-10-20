import { describe, expect, it } from "vitest";
import { PITCH_STATUSES } from "@/types/domain";
import { assertTransition, canTransition, InvalidTransitionError, isTerminal, TRANSITIONS, walk } from "@/server/pitches/state-machine";

describe("pitch state machine", () => {
  it("defines transitions for every status", () => {
    for (const s of PITCH_STATUSES) expect(TRANSITIONS[s]).toBeDefined();
  });

  it("walks the free happy path", () => {
    expect(walk("received", ["challenged", "brief_submitted", "scoring", "surfaced", "accepted"])).toBe("accepted");
  });

  it("walks the fast-track path with SLA refund", () => {
    expect(walk("challenged", ["brief_submitted", "awaiting_payment", "scoring", "surfaced", "expired", "refunded"])).toBe("refunded");
  });

  it("lets the exec rescue a filtered pitch", () => {
    expect(walk("scoring", ["filtered", "surfaced", "passed"])).toBe("passed");
  });

  it("rejects skipping the brief", () => {
    expect(canTransition("challenged", "surfaced")).toBe(false);
    expect(() => assertTransition("received", "accepted")).toThrow(InvalidTransitionError);
  });

  it("terminal states have no exits", () => {
    for (const s of ["accepted", "passed", "refunded"] as const) {
      expect(isTerminal(s)).toBe(true);
      expect(TRANSITIONS[s]).toHaveLength(0);
    }
  });

  it("cannot re-decide a decided pitch", () => {
    expect(canTransition("accepted", "passed")).toBe(false);
    expect(canTransition("passed", "accepted")).toBe(false);
  });

  it("every target state is a known status", () => {
    for (const targets of Object.values(TRANSITIONS)) for (const t of targets) expect(PITCH_STATUSES).toContain(t);
  });
});
