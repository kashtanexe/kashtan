import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { features } from "@/lib/env";
import { formatEur } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { saveFastTrackAction } from "../../actions";
import { Notice, PageHeader } from "../../page-header";
import { SettingsTabs } from "../nav";

export const metadata = { title: "Fast-Track" };

export default async function FastTrackSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const repo = getRepo();
  const pitches = await repo.listPitches({ execId: exec.id, fastTrack: true });
  const payments = (await Promise.all(pitches.map((p) => repo.getPaymentByPitch(p.id)))).filter(Boolean);
  const paid = payments.filter((p) => p!.status === "paid").reduce((s, p) => s + p!.amountCents, 0);
  const refunded = payments.filter((p) => p!.status === "refunded").length;
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs active="/app/settings/fast-track" />
      {sp.saved ? <Notice>Saved.</Notice> : null}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold">{pitches.length}</div>
          <div className="text-xs text-slate-500">Fast-Track pitches</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{formatEur(paid)}</div>
          <div className="text-xs text-slate-500">Held (to FILTR)</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{refunded}</div>
          <div className="text-xs text-slate-500">Auto-refunded (SLA missed)</div>
        </Card>
      </div>
      <Card>
        <CardContent className="space-y-6 p-6">
          <form action={saveFastTrackAction} className="space-y-6">
            <Switch name="fastTrackEnabled" defaultChecked={exec.fastTrackEnabled} label="Offer Fast-Track to vendors" description="Vendors pay for a guaranteed personal review within 7 days. If you don't decide in time, they're refunded automatically." />
            <div>
              <Label htmlFor="price">Price (€)</Label>
              <Input id="price" name="price" type="number" min={10} max={500} defaultValue={exec.fastTrackPriceCents / 100} className="w-32" />
              <p className="field-hint">Currently {formatEur(exec.fastTrackPriceCents, exec.currency)}. {features.stripe() ? "Charged via Stripe Checkout." : "Stripe not configured: payments are simulated in demo mode."}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <Switch name="charityEnabled" defaultChecked={exec.charityEnabled} label="Donate Fast-Track fees to charity" description="Helps with gift and anti-bribery policies. Shown to vendors on your Pitch Me page." />
              <div className="mt-3">
                <Label htmlFor="charityName">Charity</Label>
                <Input id="charityName" name="charityName" defaultValue={exec.charityName} placeholder="Médecins Sans Frontières" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Money always goes to the platform, never to you personally. This is stated on every vendor-facing page.</p>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
