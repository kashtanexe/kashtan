import { NextResponse, type NextRequest } from "next/server";
import { challengeReminderEmail } from "@emails/challenge-reminder";
import { AUTO_REPLY_HEADERS, deskFrom, replyToForPitch } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import { isAuthorizedCron } from "@/lib/route-auth";
import { briefUrl } from "@/server/pitches/links";
import { getRepo } from "@/server/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REMIND_AFTER_DAYS = 3;
const EXPIRE_AFTER_DAYS = 14;

/** One reminder after 3 days; challenges with no brief after 14 days expire. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const repo = getRepo();
  const now = Date.now();
  const open = await repo.listPitches({ statuses: ["challenged"] });
  const reminded: string[] = [];
  const expired: string[] = [];
  for (const p of open) {
    const age = (now - new Date(p.challengedAt ?? p.createdAt).getTime()) / 86_400_000;
    if (age >= EXPIRE_AFTER_DAYS) {
      await repo.updatePitch(p.id, { status: "expired" });
      expired.push(p.id);
      continue;
    }
    if (age >= REMIND_AFTER_DAYS && !p.reminderSentAt) {
      const [exec, contact] = await Promise.all([repo.getExec(p.execId), repo.getContact(p.contactId)]);
      if (!exec || !contact || (await repo.isSuppressed(contact.email))) continue;
      const em = challengeReminderEmail({ vendorFirstName: contact.name.split(" ")[0] ?? "there", execFirstName: exec.fullName.split(" ")[0]!, briefUrl: briefUrl(p.id), originalSubject: p.subject });
      await sendEmail({ kind: "challenge_reminder", to: contact.email, from: deskFrom(exec.fullName), replyTo: replyToForPitch(p.token), subject: em.subject, html: em.html, text: em.text, headers: AUTO_REPLY_HEADERS, stream: "challenges", pitchId: p.id, execId: exec.id });
      await repo.updatePitch(p.id, { reminderSentAt: new Date().toISOString() });
      reminded.push(p.id);
    }
  }
  return NextResponse.json({ open: open.length, reminded, expired });
}
