import { cn } from "@/lib/utils";

export function scoreTone(score: number) {
  if (score >= 85) return { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 60) return { ring: "ring-amber-200", bg: "bg-amber-50", text: "text-amber-700", bar: "bg-amber-500" };
  return { ring: "ring-rose-200", bg: "bg-rose-50", text: "text-rose-700", bar: "bg-rose-500" };
}

export function ScoreBadge({ score, size = "md", className }: { score: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const t = scoreTone(score);
  const dims = size === "lg" ? "h-20 w-20 text-3xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-14 w-14 text-xl";
  return (
    <div className={cn("flex shrink-0 flex-col items-center justify-center rounded-2xl font-bold ring-1 ring-inset", t.bg, t.text, t.ring, dims, className)}>
      <span className="leading-none">{score}</span>
      {size !== "sm" ? <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-70">match</span> : null}
    </div>
  );
}

export function SubScoreBar({ label, value, max = 25 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const t = scoreTone(pct);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-500">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div className={cn("h-1.5 rounded-full", t.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
