import { notFound } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { canAccessPitch } from "@/server/pitches/access";
import { getPitchView } from "@/server/pitches/views";
import { getRepo } from "@/server/repo";
import { isDemoMode } from "@/lib/env";
import { VendorShell } from "../../../vendor-shell";
import { VendorStatus } from "../status-view";

export const metadata = { title: "Brief submitted" };
export const dynamic = "force-dynamic";

export default async function SubmittedPage({ params, searchParams }: { params: Promise<{ pitchId: string }>; searchParams: Promise<{ t?: string; paid?: string }> }) {
  const { pitchId } = await params;
  const sp = await searchParams;
  if (!canAccessPitch(pitchId, sp.t)) notFound();
  const view = await getPitchView(pitchId);
  if (!view) notFound();
  const exec = (await getRepo().getExec(view.pitch.execId))!;
  return (
    <VendorShell>
      <div className="mb-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-brand-600" />
        <h1 className="mt-3 text-2xl font-bold">{sp.paid ? "Fast-Track confirmed" : "Thanks, your brief is in"}</h1>
        <p className="mt-1 text-slate-500">We've emailed you a confirmation with a link to check status anytime.</p>
      </div>
      <VendorStatus view={view} exec={exec} />
      {isDemoMode() ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Demo: see how this landed on {exec.fullName.split(" ")[0]}'s side →{" "}
          <a className="font-medium text-brand-700 underline" href={`/app/pitches/${pitchId}`}>
            open the Baseball Card
          </a>
        </p>
      ) : null}
    </VendorShell>
  );
}
