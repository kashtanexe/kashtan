import { NextResponse, type NextRequest } from "next/server";
import { digestFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { isDemoMode } from "@/lib/env";
import { isAuthorizedCron } from "@/lib/route-auth";
import { recordDigestSent, renderDigestForExec } from "@/server/digest/build-digest";
import { isDigestDue, weekKey } from "@/server/digest/select-due-execs";
import { getRepo } from "@/server/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Run hourly (or daily) — sends the digest to every exec for whom it is Friday ≥ 08:00
 * local time and who hasn't had this week's digest. `?force=1` (demo only) sends now.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const force = isDemoMode() && req.nextUrl.searchParams.get("force") === "1";
  const now = new Date();
  const repo = getRepo();
  const execs = (await repo.listExecs()).filter((e) => e.onboardedAt);
  const sent: string[] = [];
  for (const exec of execs) {
    const already = Boolean(await repo.getDigestRun(exec.id, weekKey(now, exec.timezone)));
    if (!force && !isDigestDue(exec, now, already)) continue;
    const { data, email } = await renderDigestForExec(exec, now);
    await sendEmail({ kind: "weekly_digest", to: exec.email, from: digestFrom(), subject: email.subject, html: email.html, text: email.text, execId: exec.id, stream: "digests" });
    await recordDigestSent(exec, { ...data.stats }, now);
    sent.push(exec.id);
  }
  return NextResponse.json({ checked: execs.length, sent });
}
