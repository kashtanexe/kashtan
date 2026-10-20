"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

function format(ms: number) {
  if (ms <= 0) return "SLA expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 48) return `${Math.floor(h / 24)}d ${h % 24}h left`;
  return `${h}h ${String(m).padStart(2, "0")}m left`;
}

export function SlaCountdown({ deadline, className }: { deadline: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(deadline).getTime() - (now ?? new Date(deadline).getTime() - 1);
  const urgent = now !== null && ms < 36 * 3_600_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
        urgent ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-brand-50 text-brand-700 ring-brand-200",
        className,
      )}
      title={`Review due ${new Date(deadline).toLocaleString()}`}
    >
      <Timer className="h-3 w-3" />
      {now === null ? "SLA" : format(ms)}
    </span>
  );
}
