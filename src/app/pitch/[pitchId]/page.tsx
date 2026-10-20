import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PitchForm } from "@/components/pitch-form/pitch-form";
import { Card, CardContent } from "@/components/ui/card";
import { formatEur, initials } from "@/lib/utils";
import { canAccessPitch } from "@/server/pitches/access";
import { getPitchView } from "@/server/pitches/views";
import { getRepo } from "@/server/repo";
import { VendorShell } from "../../vendor-shell";
import { submitBriefAction } from "./actions";

export const metadata = { title: "Your 60-second brief" };
export const dynamic = "force-dynamic";

export default async function BriefPage({ params, searchParams }: { params: Promise<{ pitchId: string }>; searchParams: Promise<{ t?: string; cancelled?: string }> }) {
  const { pitchId } = await params;
  const sp = await searchParams;
  const token = sp.t ?? "";
  if (!canAccessPitch(pitchId, token)) notFound();
  const view = await getPitchView(pitchId);
  if (!view) notFound();
  if (!["received", "challenged", "awaiting_payment"].includes(view.pitch.status)) redirect(`/pitch/${pitchId}/status?t=${encodeURIComponent(token)}`);
  const exec = (await getRepo().getExec(view.pitch.execId))!;
  const first = exec.fullName.split(" ")[0]!;
  const action = submitBriefAction.bind(null, pitchId, token);

  return (
    <VendorShell>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 font-bold text-white">{initials(exec.fullName)}</div>
        <div>
          <h1 className="text-xl font-bold">Your brief for {exec.fullName}</h1>
          <p className="text-sm text-slate-500">
            {exec.title} · {exec.companyName} · takes about 60 seconds
          </p>
        </div>
      </div>
      {sp.cancelled ? <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Payment cancelled. You can still submit for free.</p> : null}
      {view.pitch.subject && view.pitch.source !== "link" ? (
        <p className="mb-4 text-sm text-slate-500">
          Re: <span className="font-medium text-slate-700">{view.pitch.subject}</span>
        </p>
      ) : null}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <PitchForm
            action={action}
            defaults={{ contactName: view.answers?.contactName ?? view.contact.name, companyName: view.answers?.companyName ?? view.vendor.name }}
            execFirstName={first}
            fastTrack={{ enabled: exec.fastTrackEnabled, price: formatEur(exec.fastTrackPriceCents, exec.currency), charityName: exec.charityEnabled ? exec.charityName : null }}
          />
        </CardContent>
      </Card>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> {first}'s priorities stay private. Your answers are only used to route this pitch.
      </p>
    </VendorShell>
  );
}
