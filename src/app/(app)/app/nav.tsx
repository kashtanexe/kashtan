"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BellRing, Database, Filter, FlaskConical, Inbox, Rocket, Send, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppNav({ counts, demo, pro }: { counts: { inbox: number; filtered: number }; demo: boolean; pro: boolean }) {
  const path = usePathname();
  const groups: { title?: string; items: { href: string; label: string; icon: typeof Inbox; count?: number; exact?: boolean }[] }[] = [
    {
      items: [
        { href: "/app", label: "Inbox", icon: Inbox, count: counts.inbox, exact: true },
        { href: "/app/filtered", label: "Filtered", icon: Filter, count: counts.filtered },
        { href: "/app/activity", label: "Intake activity", icon: Activity },
        { href: "/app/digest", label: "Friday digest", icon: BellRing },
      ],
    },
    {
      title: pro ? "Team · Pro" : "Team",
      items: [
        { href: "/app/team", label: "Team", icon: Users, exact: true },
        { href: "/app/team/vendors", label: "Vendor database", icon: Database },
      ],
    },
    {
      title: "Setup",
      items: [
        { href: "/app/onboarding", label: "Onboarding", icon: Rocket },
        { href: "/app/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
  if (demo) {
    groups.push({
      title: "Demo tools",
      items: [
        { href: "/app/simulate", label: "Simulate inbound email", icon: FlaskConical },
        { href: "/app/outbox", label: "Outbox", icon: Send },
      ],
    });
  } else {
    groups.push({ title: "Email", items: [{ href: "/app/outbox", label: "Sent emails", icon: Send }] });
  }
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
      {groups.map((g, i) => (
        <div key={i} className="flex gap-1 lg:flex-col">
          {g.title ? <div className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">{g.title}</div> : null}
          {g.items.map((it) => {
            const active = it.exact ? path === it.href : path.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <it.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{it.label}</span>
                {it.count ? <span className={cn("ml-auto rounded-full px-1.5 text-xs tabular-nums", active ? "bg-brand-100" : "bg-slate-100")}>{it.count}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
