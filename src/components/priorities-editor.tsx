"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { savePrioritiesAction } from "@/app/(app)/app/actions";
import { COMPLIANCE_OPTIONS, type ExecPriorities } from "@/types/domain";

export function PrioritiesEditor({ current, back, submitLabel = "Save new version" }: { current: ExecPriorities | null; back: string; submitLabel?: string }) {
  const [items, setItems] = useState<string[]>(current?.priorities.length ? current.priorities : ["", "", ""]);
  return (
    <form action={savePrioritiesAction} className="space-y-6">
      <input type="hidden" name="back" value={back} />
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div>
          <Label htmlFor="quarter">Quarter</Label>
          <Input id="quarter" name="quarter" defaultValue={current?.quarter ?? "Q4 2026"} required />
        </div>
      </div>
      <div>
        <Label>Priorities this quarter</Label>
        <p className="field-hint mb-2">Plain language, most important first. This stays private: vendors never see it.</p>
        <div className="space-y-2">
          {items.map((v, i) => (
            <div key={i} className="flex gap-2">
              <span className="mt-2.5 w-5 text-right text-sm font-semibold text-slate-400">{i + 1}</span>
              <Input
                name="priority"
                value={v}
                onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={["Automate the DORA register of information", "Cut SIEM cost by 30%", "Passkeys for all staff"][i] ?? "Another priority"}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))} aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {items.length < 8 ? (
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setItems((arr) => [...arr, ""])}>
            <Plus className="h-4 w-4" /> Add priority
          </Button>
        ) : null}
      </div>
      <div>
        <Label htmlFor="narrative">Context for the AI</Label>
        <Textarea id="narrative" name="narrative" rows={3} defaultValue={current?.narrative ?? ""} placeholder="Regulated EU payment institution. Prefer EU hosting and FS references…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="budgetMinEur">Budget band: min ACV (€)</Label>
          <Input id="budgetMinEur" name="budgetMinEur" type="number" min={0} step={1000} defaultValue={current?.budgetMinEur ?? 25000} />
        </div>
        <div>
          <Label htmlFor="budgetMaxEur">Budget band: max ACV (€)</Label>
          <Input id="budgetMaxEur" name="budgetMaxEur" type="number" min={0} step={1000} defaultValue={current?.budgetMaxEur ?? 150000} />
          <p className="field-hint">Hard gate: pitches whose price band starts above this are filtered. 0 = no limit.</p>
        </div>
      </div>
      <div>
        <Label>Required compliance (hard gate)</Label>
        <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMPLIANCE_OPTIONS.map((c) => (
            <label key={c} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" name="requiredCompliance" value={c} defaultChecked={current?.requiredCompliance.includes(c)} className="accent-brand-600" />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="dealbreakers">Dealbreakers (hard gate)</Label>
        <Textarea id="dealbreakers" name="dealbreakers" rows={2} defaultValue={current?.dealbreakers.join(", ") ?? ""} placeholder="blockchain, crypto, staff augmentation" />
        <p className="field-hint">Comma or line separated. Whole-word match anywhere in the pitch.</p>
      </div>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
