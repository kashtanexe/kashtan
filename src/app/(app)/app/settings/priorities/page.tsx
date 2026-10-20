import { PrioritiesEditor } from "@/components/priorities-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { Notice, PageHeader } from "../../page-header";
import { SettingsTabs } from "../nav";

export const metadata = { title: "Priorities" };

export default async function PrioritiesSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const versions = await getRepo().listPriorities(exec.id);
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs active="/app/settings/priorities" />
      {sp.saved ? <Notice>New version saved. New pitches are scored against it; every score records the version it used.</Notice> : null}
      {sp.error ? <Notice tone="error">{sp.error}</Notice> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <Card>
          <CardContent className="p-6">
            <PrioritiesEditor current={versions[0] ?? null} back="/app/settings/priorities" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Version history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {versions.map((v, i) => (
              <div key={v.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">v{v.version}</span>
                  <span className="text-slate-500">{v.quarter}</span>
                  {i === 0 ? <Badge variant="success">current</Badge> : null}
                </div>
                <div className="text-xs text-slate-400">{formatDate(v.createdAt, exec.timezone)} · {v.priorities.length} priorities</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
