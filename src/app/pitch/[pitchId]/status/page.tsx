import { notFound } from "next/navigation";
import { canAccessPitch } from "@/server/pitches/access";
import { getPitchView } from "@/server/pitches/views";
import { getRepo } from "@/server/repo";
import { VendorShell } from "../../../vendor-shell";
import { VendorStatus } from "../status-view";

export const metadata = { title: "Pitch status" };
export const dynamic = "force-dynamic";

export default async function StatusPage({ params, searchParams }: { params: Promise<{ pitchId: string }>; searchParams: Promise<{ t?: string }> }) {
  const { pitchId } = await params;
  const sp = await searchParams;
  if (!canAccessPitch(pitchId, sp.t)) notFound();
  const view = await getPitchView(pitchId);
  if (!view) notFound();
  const exec = (await getRepo().getExec(view.pitch.execId))!;
  return (
    <VendorShell>
      <h1 className="mb-4 text-2xl font-bold">Your pitch to {exec.fullName}</h1>
      <VendorStatus view={view} exec={exec} />
    </VendorShell>
  );
}
