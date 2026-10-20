import type { ExecProfile } from "@/types/domain";

export interface LocalTime {
  weekday: number; // 0 = Sunday … 5 = Friday
  hour: number;
  minute: number;
  year: number;
  month: number;
  day: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function localTime(now: Date, timeZone: string): LocalTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return localTime(now, "UTC");
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    weekday: WEEKDAYS.indexOf(get("weekday")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
  };
}

/** ISO-8601 week key in the exec's timezone, e.g. "2026-W43". Used for digest idempotency. */
export function weekKey(now: Date, timeZone: string): string {
  const lt = localTime(now, timeZone);
  const d = new Date(Date.UTC(lt.year, lt.month - 1, lt.day));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // Thursday of this week
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const DIGEST_WEEKDAY = 5; // Friday
export const DIGEST_HOUR = 8; // 08:00 local

/**
 * Due = it's Friday, at or after 08:00 in the exec's timezone, and this week's digest
 * hasn't been sent. Works with an hourly cron (exact 08:xx) or a daily one (catch-up).
 */
export function isDigestDue(exec: Pick<ExecProfile, "timezone">, now: Date, alreadySentThisWeek: boolean): boolean {
  if (alreadySentThisWeek) return false;
  const lt = localTime(now, exec.timezone);
  return lt.weekday === DIGEST_WEEKDAY && lt.hour >= DIGEST_HOUR;
}

export function selectDueExecs<T extends Pick<ExecProfile, "id" | "timezone">>(
  execs: T[],
  now: Date,
  sentWeekKeys: Map<string, Set<string>>,
): T[] {
  return execs.filter((e) => isDigestDue(e, now, sentWeekKeys.get(e.id)?.has(weekKey(now, e.timezone)) ?? false));
}
