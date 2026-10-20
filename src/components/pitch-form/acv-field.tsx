import { Label, Select } from "@/components/ui/input";
import { ACV_BANDS, TIMELINES } from "@/types/domain";

export function AcvField({ defaultAcv, defaultTimeline }: { defaultAcv?: string; defaultTimeline?: string }) {
  return (
    <div>
      <div className="field-label">2. Price & timeline</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="acvBand" className="text-xs font-normal text-slate-500">
            Typical annual contract value
          </Label>
          <Select id="acvBand" name="acvBand" defaultValue={defaultAcv ?? "25-50k"} required>
            {ACV_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="timeline" className="text-xs font-normal text-slate-500">
            Realistic time to value
          </Label>
          <Select id="timeline" name="timeline" defaultValue={defaultTimeline ?? "this_quarter"} required>
            {TIMELINES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
