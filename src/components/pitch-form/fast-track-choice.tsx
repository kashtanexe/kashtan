"use client";

import { Zap } from "lucide-react";

export function FastTrackChoice({ price, execFirstName, charityName, enabled }: { price: string; execFirstName: string; charityName?: string | null; enabled: boolean }) {
  if (!enabled) return <input type="hidden" name="choice" value="free" />;
  return (
    <div>
      <div className="field-label">How should we route it?</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer flex-col rounded-xl border border-slate-200 p-4 hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:ring-1 has-[:checked]:ring-brand-500">
          <span className="flex items-center gap-2">
            <input type="radio" name="choice" value="free" defaultChecked className="accent-brand-600" />
            <span className="font-semibold">Free</span>
          </span>
          <span className="mt-1 text-sm text-slate-500">AI-matched against {execFirstName}'s priorities. If it fits, it goes straight to {execFirstName}.</span>
        </label>
        <label className="flex cursor-pointer flex-col rounded-xl border border-slate-200 p-4 hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:ring-1 has-[:checked]:ring-brand-500">
          <span className="flex items-center gap-2">
            <input type="radio" name="choice" value="fast_track" className="accent-brand-600" />
            <span className="inline-flex items-center gap-1 font-semibold">
              <Zap className="h-4 w-4 text-brand-600" /> Fast-Track · {price}
            </span>
          </span>
          <span className="mt-1 text-sm text-slate-500">
            Guaranteed personal review within 7 days, or an automatic refund. {charityName ? `Fee donated to ${charityName}.` : "Paid to FILTR, never to the executive."}
          </span>
        </label>
      </div>
    </div>
  );
}
