"use client";

import { useState } from "react";
import { Label, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function OneLinerField({ defaultValue = "", error }: { defaultValue?: string; error?: string }) {
  const [v, setV] = useState(defaultValue);
  const left = 140 - v.length;
  return (
    <div>
      <Label htmlFor="oneLiner">1. What do you fix, in one sentence?</Label>
      <Textarea
        id="oneLiner"
        name="oneLiner"
        rows={2}
        maxLength={140}
        required
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="We cut DORA register-of-information prep from 6 weeks to 4 days for EU payment institutions."
      />
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-rose-600">{error}</span>
        <span className={cn("tabular-nums", left < 15 ? "text-amber-600" : "text-slate-400")}>{left} characters left</span>
      </div>
    </div>
  );
}
