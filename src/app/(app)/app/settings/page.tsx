import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TIMEZONES } from "@/lib/timezones";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { suggestThreshold } from "@/server/scoring/threshold";
import { saveSettingsAction } from "../actions";
import { Notice, PageHeader } from "../page-header";
import { SettingsTabs } from "./nav";

export const metadata = { title: "Settings" };


export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const pitches = await getRepo().listPitches({ execId: exec.id });
  const scores = (await Promise.all(pitches.map((p) => getRepo().getScore(p.id)))).filter(Boolean).map((s) => s!.total);
  const weeks = Math.max(1, Math.round((Date.now() - Math.min(...pitches.map((p) => new Date(p.createdAt).getTime()), Date.now())) / (7 * 86_400_000)));
  const suggested = suggestThreshold(scores, weeks, 2);
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs active="/app/settings" />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      {sp.error === "calendar" ? <Notice tone="error">Calendar link must be a full https:// URL.</Notice> : null}
      <Card>
        <CardContent className="p-6">
          <form action={saveSettingsAction} className="space-y-6">
            <div>
              <Label htmlFor="threshold">Match threshold</Label>
              <div className="flex items-center gap-3">
                <Input id="threshold" name="threshold" type="number" min={40} max={99} defaultValue={exec.threshold} className="w-28" />
                <span className="text-sm text-slate-500">
                  Pitches scoring at least this become Baseball Cards. Suggested from your history: <strong>{suggested}</strong> (~2 cards/week).
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="calendarUrl">Calendar booking link</Label>
              <Input id="calendarUrl" name="calendarUrl" type="url" defaultValue={exec.calendarUrl} placeholder="https://cal.com/you/20min" />
              <p className="field-hint">Cal.com or Calendly. Sent to vendors when you accept, prefilled with their details.</p>
            </div>
            <div>
              <Label htmlFor="timezone">Timezone (Friday digest at 08:00 local)</Label>
              <Select id="timezone" name="timezone" defaultValue={exec.timezone}>
                {[...new Set([exec.timezone, ...TIMEZONES])].map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <Switch
                name="autoUnlock"
                defaultChecked={exec.autoUnlock}
                label="Auto-unlock my calendar for top matches"
                description="Off by default. When on, pitches that pass every hard gate and score above your threshold get your calendar link automatically, up to the daily cap. One bad unlock is worse than ten slow ones."
              />
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Label htmlFor="autoUnlockDailyCap" className="mb-0">
                  Daily cap
                </Label>
                <Input id="autoUnlockDailyCap" name="autoUnlockDailyCap" type="number" min={1} max={10} defaultValue={exec.autoUnlockDailyCap} className="w-20" />
              </div>
            </div>
            <Button type="submit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
