import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { href: "/app/onboarding/profile", label: "Profile" },
  { href: "/app/onboarding/priorities", label: "Q priorities" },
  { href: "/app/onboarding/intake", label: "Alias & bio link" },
];

export function OnboardingSteps({ active, done }: { active: number; done: boolean[] }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2">
      {STEPS.map((s, i) => (
        <li key={s.href} className="flex items-center gap-2">
          <Link
            href={s.href}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset",
              i === active ? "bg-brand-600 text-white ring-brand-600" : done[i] ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-slate-600 ring-slate-200",
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">{done[i] && i !== active ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            {s.label}
          </Link>
          {i < STEPS.length - 1 ? <span className="h-px w-6 bg-slate-200" /> : null}
        </li>
      ))}
    </ol>
  );
}
