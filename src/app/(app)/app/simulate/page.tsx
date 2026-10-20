import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldX } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { forwardingAddress, publicAlias } from "@/lib/email/headers";
import { getCurrentExec } from "@/server/auth";
import { SAMPLE_KEYS, SAMPLE_META, type SampleKey } from "@/server/intake/samples";
import { briefUrl } from "@/server/pitches/links";
import { simulateInboundAction } from "../actions";
import { PageHeader } from "../page-header";

export const metadata = { title: "Simulate inbound email" };

export default async function SimulatePage({ searchParams }: { searchParams: Promise<{ sample?: string; outcome?: string; detail?: string; pitch?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const ok = sp.outcome === "challenge_sent";
  return (
    <div>
      <PageHeader
        title="Simulate inbound email"
        description="Fire a real-shaped Postmark inbound payload through the exact same pipeline the webhook uses: classify → verify forwarder → extract original sender → loop guard → triage → challenge."
      />

      {sp.outcome ? (
        <Card className={`mb-6 ${ok ? "border-emerald-200" : "border-rose-200"}`}>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            {ok ? <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" /> : <ShieldX className="h-8 w-8 shrink-0 text-rose-600" />}
            <div className="flex-1">
              <div className="font-semibold">
                {SAMPLE_META[sp.sample as SampleKey]?.label}: {sp.outcome.replace(/_/g, " ")}
              </div>
              <div className="text-sm text-slate-600">{sp.detail}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ok ? (
                <>
                  <Link href="/app/outbox" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    See the challenge email
                  </Link>
                  {sp.pitch ? (
                    <a href={briefUrl(sp.pitch)} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
                      Open the vendor brief <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : null}
                </>
              ) : (
                <Link href="/app/activity" className={buttonVariants({ variant: "outline", size: "sm" })}>
                  See intake log
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form action={simulateInboundAction} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>1. Pick a scenario</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {SAMPLE_KEYS.map((k, i) => (
              <label key={k} className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/50">
                <input type="radio" name="sample" value={k} defaultChecked={sp.sample ? sp.sample === k : i === 0} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block text-sm font-medium">{SAMPLE_META[k].label}</span>
                  <span className="block text-xs text-slate-500">{SAMPLE_META[k].description}</span>
                  <span className="mt-1 block text-[11px] font-medium text-slate-400">Expected: {SAMPLE_META[k].expect}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>2. Optional: customise the cold email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500">Leave blank for a random realistic vendor. Each sender is challenged at most once per 30 days.</p>
              <div>
                <Label htmlFor="vendorName">Vendor name</Label>
                <Input id="vendorName" name="vendorName" placeholder="e.g. Sophie Laurent" />
              </div>
              <div>
                <Label htmlFor="vendorEmail">Vendor email</Label>
                <Input id="vendorEmail" name="vendorEmail" type="email" placeholder="sophie@cyberlynx.eu" />
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="Quick question about DORA" />
              </div>
              <div>
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" name="body" rows={4} placeholder="Hi Claire, …" />
              </div>
              <Button type="submit" className="w-full">
                Send to {exec.fullName.split(" ")[0]}&apos;s alias
              </Button>
            </CardContent>
          </Card>
          <Card className="p-4 text-xs text-slate-500">
            <div>
              Forwarding address: <span className="font-mono text-slate-700">{forwardingAddress(exec.aliasLocalPart, exec.aliasSecret)}</span>
            </div>
            <div className="mt-1">
              Public alias: <span className="font-mono text-slate-700">{publicAlias(exec.aliasLocalPart)}</span>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
