import Link from "next/link";
import { Ban, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScoreBadge } from "@/components/score-badge";
import { relativeTime } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { listPitchViews } from "@/server/pitches/views";
import { promoteAction } from "../actions";
import { PageHeader } from "../page-header";

export const metadata = { title: "Filtered" };

export default async function FilteredPage() {
  const exec = await getCurrentExec();
  const views = await listPitchViews({ execId: exec.id, statuses: ["filtered"] });
  return (
    <div>
      <PageHeader
        title="Filtered"
        description={`Audit trail: every pitch that didn't clear your bar (${exec.threshold}) or a hard gate, and why. Rescue anything the filter got wrong.`}
      />
      <Card className="divide-y divide-slate-100">
        {views.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">Nothing filtered yet.</div> : null}
        {views.map((v) => (
          <div key={v.pitch.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <ScoreBadge score={v.score?.total ?? 0} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/app/pitches/${v.pitch.id}`} className="font-medium hover:underline">
                  {v.answers?.companyName ?? v.vendor.name}
                </Link>
                <span className="text-xs text-slate-400">{relativeTime(v.pitch.createdAt)}</span>
                {v.score?.injectionSuspected ? (
                  <Badge variant="danger">
                    <ShieldAlert className="h-3 w-3" /> Injection attempt
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-sm text-slate-600">{v.answers?.oneLiner}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                {v.score?.hardGates.failures.length ? (
                  v.score.hardGates.failures.map((f) => (
                    <Badge key={f.gate} variant="danger">
                      <Ban className="h-3 w-3" /> {f.detail}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="warning">Below threshold: {v.score?.rationale ?? "low match"}</Badge>
                )}
              </div>
            </div>
            <form action={promoteAction}>
              <input type="hidden" name="pitchId" value={v.pitch.id} />
              <Button variant="outline" size="sm" type="submit">
                Move to inbox
              </Button>
            </form>
          </div>
        ))}
      </Card>
    </div>
  );
}
