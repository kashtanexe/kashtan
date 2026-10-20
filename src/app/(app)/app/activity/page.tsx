import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, relativeTime } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { listPitchViews } from "@/server/pitches/views";
import { getRepo } from "@/server/repo";
import { PageHeader } from "../page-header";

export const metadata = { title: "Intake activity" };

function outcomeVariant(o: string) {
  if (o.startsWith("challenge") || o === "brief_link_resent") return "success" as const;
  if (o.startsWith("needs_exec")) return "warning" as const;
  if (o.startsWith("dropped")) return "danger" as const;
  return "default" as const;
}

export default async function ActivityPage() {
  const exec = await getCurrentExec();
  const [inbound, waiting] = await Promise.all([getRepo().listInbound(exec.id), listPitchViews({ execId: exec.id, statuses: ["challenged", "awaiting_payment"] })]);
  return (
    <div className="space-y-6">
      <PageHeader title="Intake activity" description="Every email that reached your alias, what we did with it, and who still owes you a brief." />
      <Card>
        <CardHeader>
          <CardTitle>Waiting on the vendor ({waiting.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {waiting.length === 0 ? <p className="px-5 pb-5 text-sm text-slate-500">No open challenges.</p> : null}
          {waiting.map((v) => (
            <div key={v.pitch.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <div>
                <Link href={`/app/pitches/${v.pitch.id}`} className="font-medium hover:underline">
                  {v.vendor.name}
                </Link>{" "}
                <span className="text-slate-500">· {v.contact.email}</span>
                <div className="text-xs text-slate-500">“{v.pitch.subject}”</div>
              </div>
              <span className="text-xs text-slate-500">challenged {v.pitch.challengedAt ? relativeTime(v.pitch.challengedAt) : "n/a"}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Inbound log</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Route</th>
                <th className="px-3 py-2 font-medium">Original sender</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inbound.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-2.5 text-slate-500">{formatDate(i.receivedAt, exec.timezone)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline">{i.routeType.replace(/_/g, " ")}</Badge>
                    {i.extractionMethod ? <div className="mt-1 text-[11px] text-slate-400">{i.extractionMethod}</div> : null}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{i.originalSenderEmail ?? i.fromEmail}</td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-slate-600">{i.subject}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant={outcomeVariant(i.outcome)}>{i.outcome.replace(/_/g, " ")}</Badge>
                    {i.note ? <div className="mt-1 max-w-[260px] text-[11px] text-slate-500">{i.note}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
