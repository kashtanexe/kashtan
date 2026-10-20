import { Input, Label, Textarea } from "@/components/ui/input";

export function ProofField({ defaultUrl = "", defaultText = "", errorUrl, errorText }: { defaultUrl?: string; defaultText?: string; errorUrl?: string; errorText?: string }) {
  return (
    <div>
      <div className="field-label">4. One concrete proof point</div>
      <Textarea name="proofText" rows={3} required defaultValue={defaultText} maxLength={600} placeholder="Live at 3 EU payment institutions; last RoI submission: 1,140 contracts mapped in 4 days, zero supervisor findings." />
      {errorText ? <p className="mt-1 text-xs text-rose-600">{errorText}</p> : null}
      <Label htmlFor="proofUrl" className="mt-3 text-xs font-normal text-slate-500">
        Link to a case study or reference (optional)
      </Label>
      <Input id="proofUrl" name="proofUrl" type="url" defaultValue={defaultUrl} placeholder="https://…" />
      {errorUrl ? <p className="mt-1 text-xs text-rose-600">{errorUrl}</p> : null}
    </div>
  );
}
