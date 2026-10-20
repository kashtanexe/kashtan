"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { checkLoopGuard } from "@/server/intake/loop-guard";
import { startPitchFromLink } from "@/server/pitches/create-pitch";
import { getRepo } from "@/server/repo";

const Schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().min(2).max(80),
});

export async function startPitchAction(slug: string, formData: FormData) {
  const repo = getRepo();
  const exec = await repo.getExecBySlug(slug);
  if (!exec) redirect("/");
  const parsed = Schema.safeParse({ name: formData.get("name"), email: formData.get("email"), company: formData.get("company") });
  if (!parsed.success) redirect(`/in/${slug}?error=invalid`);
  if (String(formData.get("website") ?? "")) redirect(`/in/${slug}?sent=1`); // honeypot
  const { name, email, company } = parsed.data;

  const guard = checkLoopGuard({
    senderEmail: email,
    lastChallengeAt: await repo.lastChallengeAt(exec.id, email),
    suppressed: await repo.isSuppressed(email),
    ownDomains: [exec.email.split("@")[1] ?? ""],
  });
  if (!guard.allowed) redirect(`/in/${slug}?error=${guard.reason}`);

  const { pitch, briefUrl } = await startPitchFromLink({ exec, email, name, company });
  // In demo mode there is no inbox to check: go straight to the brief.
  if (isDemoMode()) redirect(briefUrl.replace(/^https?:\/\/[^/]+/, ""));
  redirect(`/in/${slug}?sent=1&p=${pitch.id}`);
}
