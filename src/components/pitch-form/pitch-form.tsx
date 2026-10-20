"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AcvField } from "./acv-field";
import { ComplianceField } from "./compliance-field";
import { FastTrackChoice } from "./fast-track-choice";
import { OneLinerField } from "./one-liner-field";
import { ProofField } from "./proof-field";

export interface PitchFormState {
  errors?: Record<string, string>;
  message?: string;
  values?: { contactName?: string; companyName?: string; acvBand?: string; timeline?: string; compliance?: string[]; proofUrl?: string; proofText?: string };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Scoring your brief…" : "Submit brief"}
    </Button>
  );
}

export function PitchForm({
  action,
  defaults,
  execFirstName,
  fastTrack,
}: {
  action: (state: PitchFormState, formData: FormData) => Promise<PitchFormState>;
  defaults: { contactName: string; companyName: string };
  execFirstName: string;
  fastTrack: { enabled: boolean; price: string; charityName: string | null };
}) {
  const [state, formAction] = useActionState(action, {});
  const e = state.errors ?? {};
  const v = state.values ?? {};
  return (
    <form action={formAction} className="space-y-7">
      {state.message ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactName">Your name</Label>
          <Input id="contactName" name="contactName" defaultValue={v.contactName ?? defaults.contactName} required />
          {e.contactName ? <p className="mt-1 text-xs text-rose-600">{e.contactName}</p> : null}
        </div>
        <div>
          <Label htmlFor="companyName">Company</Label>
          <Input id="companyName" name="companyName" defaultValue={v.companyName ?? defaults.companyName} required />
          {e.companyName ? <p className="mt-1 text-xs text-rose-600">{e.companyName}</p> : null}
        </div>
      </div>
      <OneLinerField error={e.oneLiner} />
      <AcvField defaultAcv={v.acvBand} defaultTimeline={v.timeline} />
      <ComplianceField defaultValue={v.compliance} />
      <ProofField defaultText={v.proofText} defaultUrl={v.proofUrl} errorText={e.proofText} errorUrl={e.proofUrl} />
      <FastTrackChoice enabled={fastTrack.enabled} price={fastTrack.price} charityName={fastTrack.charityName} execFirstName={execFirstName} />
      <SubmitButton />
      <p className="text-center text-xs text-slate-400">By submitting you agree that {execFirstName}'s vendor desk processes this brief. You can opt out of future emails at any time.</p>
    </form>
  );
}
