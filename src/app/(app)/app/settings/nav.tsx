import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/settings", label: "General" },
  { href: "/app/settings/priorities", label: "Priorities" },
  { href: "/app/settings/fast-track", label: "Fast-Track" },
  { href: "/app/settings/billing", label: "Billing" },
];

export function SettingsTabs({ active }: { active: string }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", active === t.href ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
