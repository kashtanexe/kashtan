import { COMPLIANCE_OPTIONS } from "@/types/domain";

export function ComplianceField({ defaultValue = [] }: { defaultValue?: string[] }) {
  return (
    <div>
      <div className="field-label">3. Compliance you can evidence today</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {COMPLIANCE_OPTIONS.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50/60">
            <input type="checkbox" name="compliance" value={c} defaultChecked={defaultValue.includes(c)} className="accent-brand-600" />
            {c}
          </label>
        ))}
      </div>
      <p className="field-hint">Self-attested and shown as such. Claiming certifications you don't hold disqualifies the pitch.</p>
    </div>
  );
}
