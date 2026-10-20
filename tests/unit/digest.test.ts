import { describe, expect, it } from "vitest";
import { isDigestDue, localTime, selectDueExecs, weekKey } from "@/server/digest/select-due-execs";
import { computeSlaDeadline, isSlaBreached } from "@/server/payments/sla";

describe("digest timing (timezone aware)", () => {
  // Friday 23 Oct 2026, 06:30 UTC = 08:30 Amsterdam (CEST, UTC+2) = 02:30 New York
  const fri0630 = new Date("2026-10-23T06:30:00Z");

  it("computes local time", () => {
    expect(localTime(fri0630, "Europe/Amsterdam")).toMatchObject({ weekday: 5, hour: 8 });
    expect(localTime(fri0630, "America/New_York")).toMatchObject({ weekday: 5, hour: 2 });
  });

  it("is due on Friday 08:xx local, not before, and only once per week", () => {
    expect(isDigestDue({ timezone: "Europe/Amsterdam" }, fri0630, false)).toBe(true);
    expect(isDigestDue({ timezone: "America/New_York" }, fri0630, false)).toBe(false);
    expect(isDigestDue({ timezone: "Europe/Amsterdam" }, fri0630, true)).toBe(false);
    expect(isDigestDue({ timezone: "Europe/Amsterdam" }, new Date("2026-10-22T06:30:00Z"), false)).toBe(false);
  });

  it("selects only due execs", () => {
    const execs = [
      { id: "a", timezone: "Europe/Amsterdam" },
      { id: "b", timezone: "America/New_York" },
      { id: "c", timezone: "Europe/Paris" },
    ];
    const sent = new Map([["c", new Set([weekKey(fri0630, "Europe/Paris")])]]);
    expect(selectDueExecs(execs, fri0630, sent).map((e) => e.id)).toEqual(["a"]);
  });

  it("produces ISO week keys", () => {
    expect(weekKey(fri0630, "Europe/Amsterdam")).toBe("2026-W43");
    expect(weekKey(new Date("2027-01-01T12:00:00Z"), "UTC")).toBe("2026-W53");
  });
});

describe("fast-track SLA", () => {
  it("breaches after 7 days without a decision", () => {
    const paid = new Date("2026-10-01T10:00:00Z");
    const deadline = computeSlaDeadline(paid);
    expect(deadline).toBe("2026-10-08T10:00:00.000Z");
    const pay = { status: "paid" as const, slaDeadline: deadline };
    expect(isSlaBreached(pay, { status: "surfaced" }, new Date("2026-10-08T10:00:01Z"))).toBe(true);
    expect(isSlaBreached(pay, { status: "surfaced" }, new Date("2026-10-07T10:00:00Z"))).toBe(false);
    expect(isSlaBreached(pay, { status: "accepted" }, new Date("2026-10-09T10:00:00Z"))).toBe(false);
    expect(isSlaBreached({ ...pay, status: "refunded" }, { status: "surfaced" }, new Date("2026-10-09T10:00:00Z"))).toBe(false);
  });
});
