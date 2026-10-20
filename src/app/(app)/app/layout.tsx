import Link from "next/link";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { isDemoMode } from "@/lib/env";
import { initials } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";
import { AppNav } from "./nav";
import { resetDemoAction } from "./actions";
import { signOut } from "@/app/(auth)/login/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const exec = await getCurrentExec();
  const repo = getRepo();
  const [surfaced, filtered, org] = await Promise.all([
    repo.listPitches({ execId: exec.id, statuses: ["surfaced"] }),
    repo.listPitches({ execId: exec.id, statuses: ["filtered"] }),
    repo.getOrganization(exec.orgId),
  ]);
  const demo = isDemoMode();

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Logo href="/app" />
          <DemoBadge className="lg:hidden" />
        </div>
        <AppNav counts={{ inbox: surfaced.length, filtered: filtered.length }} demo={demo} pro={org?.plan !== "free"} />
        <div className="mt-auto hidden border-t border-slate-100 p-4 lg:block">
          <DemoBadge className="mb-3" />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">{initials(exec.fullName)}</div>
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{exec.fullName}</div>
              <div className="truncate text-xs text-slate-500">
                {exec.title ? `${exec.title.replace("Chief Information Security Officer", "CISO")} · ` : ""}
                {exec.companyName}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-3 text-xs text-slate-500">
            {demo ? (
              <form action={resetDemoAction}>
                <button className="hover:text-slate-900" type="submit">
                  Reset demo data
                </button>
              </form>
            ) : (
              <form action={signOut}>
                <button className="hover:text-slate-900" type="submit">
                  Sign out
                </button>
              </form>
            )}
            <Link href="/" className="hover:text-slate-900">
              Website
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
