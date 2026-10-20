import Link from "next/link";
import { FlaskConical, Inbox as InboxIcon } from "lucide-react";
import { BaseballCard } from "@/components/baseball-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDemoMode } from "@/lib/env";
import { getCurrentExec } from "@/server/auth";
import { listPitchViews, sortForInbox } from "@/server/pitches/views";
import { buildVendorDatabase } from "@/server/vendors/team-history";
import { getRepo } from "@/server/repo";
import { Notice, PageHeader } from "./page-header";

export const metadata = { title: "Inbox" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ decided?: string; reset?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const repo = getRepo();
  const [all, org] = await Promise.all([listPitchViews({ execId: exec.id }), repo.getOrganization(exec.orgId)]);
  const inbox = sortForInbox(all.filter((v) => v.pitch.status === "surfaced"));
  const colleagueMap = new Map<string, number>();
  if (org && org.plan !== "free") {
    const db = await buildVendorDatabase(exec.orgId, exec.id);
    db.rows.forEach((r) => colleagueMap.set(r.vendor.id, r.colleagueCount));
  }

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = all.filter((v) => new Date(v.pitch.createdAt).getTime() > weekAgo);
  const stats = [
    { label: "Cold pitches this week", value: thisWeek.length },
    { label: "Waiting on vendor", value: all.filter((v) => v.pitch.status === "challenged").length },
    { label: "Filtered for you", value: all.filter((v) => v.pitch.status === "filtered").length },
    { label: "Fast-Track pending", value: inbox.filter((v) => v.pitch.fastTrack).length },
  ];
  const priorities = await repo.getCurrentPriorities(exec.id);

  return (
    <div>
      <PageHeader
        title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${exec.fullName.split(" ")[0]}`}
        description={
          <>
            {inbox.length} pitch{inbox.length === 1 ? "" : "es"} cleared your bar ({exec.threshold}+) or were Fast-Tracked. Scored against your{" "}
            <Link href="/app/settings/priorities" className="font-medium text-brand-700 hover:underline">
              {priorities?.quarter ?? "current"} priorities (v{priorities?.version ?? 0})
            </Link>
            .
          </>
        }
        actions={
          isDemoMode() ? (
            <Link href="/app/simulate" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <FlaskConical className="h-4 w-4" /> Simulate a cold email
            </Link>
          ) : null
        }
      />
      {sp.decided === "passed" ? <Notice>Passed. The vendor has been notified with your reason.</Notice> : null}
      {sp.reset ? <Notice tone="info">Demo data reset to the seed.</Notice> : null}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold tabular-nums">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </Card>
        ))}
      </div>

      {inbox.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-center">
          <InboxIcon className="h-8 w-8 text-slate-300" />
          <div className="font-medium">Inbox zero, the good kind.</div>
          <p className="max-w-sm text-sm text-slate-500">Nothing cleared your bar right now. Everything else is in Filtered, with the reason.</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {inbox.map((v) => (
            <BaseballCard key={v.pitch.id} view={v} colleagues={colleagueMap.get(v.vendor.id) ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
