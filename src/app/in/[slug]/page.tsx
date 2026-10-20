import { notFound } from "next/navigation";
import { Clock, HeartHandshake, MailCheck, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { isDemoMode } from "@/lib/env";
import { formatEur, initials } from "@/lib/utils";
import { getRepo } from "@/server/repo";
import { VendorShell } from "../../vendor-shell";
import { startPitchAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exec = await getRepo().getExecBySlug(slug);
  return { title: exec ? `Pitch ${exec.fullName}` : "Pitch Me" };
}

const ERRORS: Record<string, string> = {
  invalid: "Please fill in your name, a valid work email and your company.",
  rate_limited: "You've already pitched recently. One pitch per 30 days, please.",
  suppressed: "This address has opted out.",
  noreply_sender: "Please use a real reply-able work address.",
};

export default async function PitchMePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const exec = await getRepo().getExecBySlug(slug);
  if (!exec) notFound();
  const first = exec.fullName.split(" ")[0];
  const action = startPitchAction.bind(null, slug);

  return (
    <VendorShell>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 px-6 py-8 text-white sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/30">{initials(exec.fullName)}</div>
            <div>
              <h1 className="text-2xl font-bold">{exec.fullName}</h1>
              <div className="text-brand-100">
                {exec.title} · {exec.companyName}
              </div>
              {exec.companySize ? <div className="text-sm text-brand-200">{exec.companySize}</div> : null}
            </div>
          </div>
          {exec.bio ? <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-brand-50">“{exec.bio}”</p> : null}
        </div>
        <CardContent className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
          <div>
            {sp.sent ? (
              <div className="rounded-xl bg-emerald-50 p-6 text-center ring-1 ring-inset ring-emerald-200">
                <MailCheck className="mx-auto h-8 w-8 text-emerald-600" />
                <div className="mt-2 font-semibold">Check your inbox</div>
                <p className="mt-1 text-sm text-slate-600">We sent you a link to the 60-second brief.</p>
              </div>
            ) : (
              <form action={action} className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Pitch {first} in 60 seconds</h2>
                  <p className="text-sm text-slate-500">
                    {first} reviews vendors through a short brief, matched against what {first} actually needs this quarter. No cold calls, no sequences.
                  </p>
                </div>
                {sp.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{ERRORS[sp.error] ?? "Something went wrong."}</p> : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" name="name" required placeholder="Jane Smith" autoComplete="name" />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" required placeholder="Acme Security" autoComplete="organization" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" name="email" type="email" required placeholder="jane@acme.com" autoComplete="email" />
                </div>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                <Button type="submit" size="lg" className="w-full">
                  Start my brief
                </Button>
                <p className="text-center text-xs text-slate-400">
                  {isDemoMode() ? "Demo mode: you'll go straight to the brief (normally we email you a link)." : "We'll email you a link to confirm your address."}
                </p>
              </form>
            )}
          </div>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <div className="font-medium">Scored on merit</div>
                <div className="text-slate-500">Against {first}'s private priorities for this quarter.</div>
              </div>
            </div>
            <div className="flex gap-3">
              <HeartHandshake className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <div className="font-medium">A real answer</div>
                <div className="text-slate-500">A calendar link, or a clear “not now” with the reason.</div>
              </div>
            </div>
            {exec.fastTrackEnabled ? (
              <div className="flex gap-3">
                <Zap className="h-5 w-5 shrink-0 text-brand-600" />
                <div>
                  <div className="font-medium">Optional Fast-Track · {formatEur(exec.fastTrackPriceCents, exec.currency)}</div>
                  <div className="text-slate-500">
                    Guaranteed personal review within 7 days or an automatic refund.
                    {exec.charityEnabled && exec.charityName ? ` Fees are donated to ${exec.charityName}.` : " Paid to GatekeeperAI, never to the executive."}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <div className="font-medium">4 questions</div>
                <div className="text-slate-500">One sentence · price & timeline · compliance · proof.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </VendorShell>
  );
}
