import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { initials } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { buildVendorDatabase } from "@/server/vendors/team-history";
import { PageHeader } from "../page-header";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const exec = await getCurrentExec();
  const repo = getRepo();
  const org = await repo.getOrganization(exec.orgId);
  const { rows, execs } = await buildVendorDatabase(exec.orgId, exec.id);
  const pitches = await repo.listPitches({ execIds: execs.map((e) => e.id) });
  const shared = rows.filter((r) => r.execs.length > 1);
  return (
    <div className="space-y-6">
      <PageHeader
        title={`${org?.name ?? "Your"} team`}
        description="Pro: one vendor desk per executive, one shared memory for the company."
        actions={<Badge variant="brand">{org?.plan === "free" ? "Free plan" : `${org?.plan} plan`}</Badge>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{execs.length}</div>
          <div className="text-xs text-slate-500">Executives on the desk</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{pitches.length}</div>
          <div className="text-xs text-slate-500">Pitches handled</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{shared.length}</div>
          <div className="text-xs text-slate-500">Vendors pitching several of you</div>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {execs.map((e) => {
            const mine = pitches.filter((p) => p.execId === e.id);
            return (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">{initials(e.fullName)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {e.fullName} {e.id === exec.id ? <span className="text-xs text-slate-400">(you)</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">{e.title}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">{mine.length} pitches</Badge>
                  <Badge variant="success">{mine.filter((p) => p.status === "accepted").length} accepted</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Routing rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3">If a pitch matches <strong>“procurement”, “contract”, “licence true-up”</strong> → also show to Sofia Romero (Procurement)</div>
          <div className="rounded-lg bg-slate-50 p-3">If a pitch is about <strong>developer tooling / CI</strong> → route to Lukas Becker (CTO) instead of the CISO</div>
          <p className="text-xs text-slate-400">Routing rules are illustrative in this MVP (Phase 5 stub). Enterprise adds CRM/procurement webhooks.</p>
        </CardContent>
      </Card>
      <Link href="/app/team/vendors" className={buttonVariants()}>
        Open the shared vendor database <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
