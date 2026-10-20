import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { relativeTime } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { STATUS_LABEL } from "@/server/pitches/state-machine";
import { buildVendorDatabase } from "@/server/vendors/team-history";
import { PageHeader } from "../../page-header";

export const metadata = { title: "Vendor database" };

const tone = (s: string) => (s === "accepted" ? "success" : s === "passed" || s === "filtered" ? "danger" : s === "surfaced" ? "brand" : "outline") as "success" | "danger" | "brand" | "outline";

export default async function VendorDatabasePage() {
  const exec = await getCurrentExec();
  const { rows } = await buildVendorDatabase(exec.orgId, exec.id);
  return (
    <div>
      <PageHeader title="Shared vendor database" description="Who else here got pitched by them, and how did it go? Normalised by company domain across every executive's desk." />
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-2.5 font-medium">Vendor</th>
              <th className="px-3 py-2.5 font-medium">Reach</th>
              <th className="px-3 py-2.5 font-medium">Pitched to</th>
              <th className="px-3 py-2.5 font-medium">Last pitch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.vendor.id} className="align-top">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{r.vendor.name}</div>
                  <div className="text-xs text-slate-500">{r.vendor.domain}</div>
                </td>
                <td className="px-3 py-3">
                  {r.execs.length > 1 ? (
                    <Badge variant={r.execs.length >= 3 ? "warning" : "brand"}>Pitched to {r.execs.length} of you</Badge>
                  ) : (
                    <Badge variant="outline">1 exec</Badge>
                  )}
                  {r.anyAccepted ? <div className="mt-1 text-xs text-emerald-700">Someone took a meeting</div> : null}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    {r.execs.map((e) => (
                      <div key={e.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={e.id === exec.id ? "font-semibold" : ""}>{e.id === exec.id ? "You" : e.name}</span>
                        <Badge variant={tone(e.status)}>{STATUS_LABEL[e.status]}</Badge>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{relativeTime(r.lastPitchedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
