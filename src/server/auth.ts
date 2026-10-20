import { redirect } from "next/navigation";
import { features } from "@/lib/env";
import { slugify } from "@/lib/utils";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getRepo } from "@/server/repo";
import { DEMO_EXEC_ID } from "@/server/repo/demo-seed";
import type { ExecProfile } from "@/types/domain";

/**
 * The signed-in exec. Demo mode: the seeded demo exec (no login).
 * Supabase mode: the magic-link user; their exec profile is claimed by email
 * (e.g. the seeded one) or created on first visit.
 */
export async function getCurrentExec(): Promise<ExecProfile> {
  const repo = getRepo();
  if (!features.supabase()) {
    const exec = (await repo.getExec(DEMO_EXEC_ID)) ?? (await repo.listExecs())[0];
    if (!exec) throw new Error("Demo store is empty");
    return exec;
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mine = await repo.getExecByUserId(user.id);
  if (mine) return mine;

  const email = (user.email ?? "").toLowerCase();
  const unclaimed = (await repo.listExecs()).find((e) => !e.userId && e.email.toLowerCase() === email);
  if (unclaimed) return repo.updateExec(unclaimed.id, { userId: user.id });

  const domain = email.split("@")[1] ?? "example.com";
  const org = await repo.createOrganization({ name: domain, domain, plan: "free" });
  const local = email.split("@")[0] ?? "exec";
  let slug = slugify(local) || "exec";
  if (await repo.getExecBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  return repo.createExec({
    orgId: org.id,
    userId: user.id,
    slug,
    fullName: local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    title: "",
    email,
    companyName: "",
    companySize: "",
    timezone: "Europe/Paris",
    bio: "",
    threshold: 85,
    autoUnlock: false,
    autoUnlockDailyCap: 2,
    calendarUrl: "",
    fastTrackEnabled: true,
    fastTrackPriceCents: 3000,
    currency: "EUR",
    charityEnabled: false,
    charityName: "",
    aliasLocalPart: slug.replace(/-/g, "."),
    aliasSecret: Math.random().toString(36).slice(2, 8),
    verifiedAddresses: [email],
    onboardedAt: null,
  });
}
