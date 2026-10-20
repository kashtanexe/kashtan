import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pricing" };

const tiers = [
  {
    name: "Individual",
    price: "€0",
    period: "forever",
    blurb: "Inbox shield for one executive.",
    features: ["Pitch Me link + private alias", "AI scoring against your priorities", "Baseball Cards & 1-click decisions", "Friday digest", "Fast-Track (vendors pay, you don't)"],
    cta: "Start free",
    href: "/login",
    highlight: false,
  },
  {
    name: "Pro",
    price: "€49",
    period: "per exec / month",
    blurb: "For leadership teams that get pitched by the same vendors.",
    features: ["Everything in Individual", "Shared vendor database (“pitched to 3 colleagues”)", "Team routing rules", "Threshold auto-calibration", "Priority support"],
    cta: "Talk to us",
    href: "/login",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "Procurement & security integrations.",
    features: ["Everything in Pro", "CRM / procurement webhooks", "SSO & SCIM", "Custom DPA & data residency", "Vendor verification (SOC 2 / ISO evidence)"],
    cta: "Contact sales",
    href: "/login",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">Simple pricing</h1>
        <p className="mt-3 text-slate-600">Executives use GatekeeperAI for free. Vendors can optionally pay for a guaranteed, refundable Fast-Track review.</p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={cn("flex flex-col rounded-2xl border bg-white p-8", t.highlight ? "border-brand-500 shadow-xl ring-1 ring-brand-500" : "border-slate-200 shadow-card")}>
            <div className="text-sm font-semibold text-brand-700">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{t.price}</span>
              <span className="text-sm text-slate-500">{t.period}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{t.blurb}</p>
            <ul className="mt-6 flex-1 space-y-2 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {f}
                </li>
              ))}
            </ul>
            <Link href={t.href} className={cn(buttonVariants({ variant: t.highlight ? "default" : "outline" }), "mt-8")}>
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">
        <strong className="text-slate-900">Vendor Fast-Track:</strong> ~€30 per pitch (set by each executive). Guaranteed human review within 7 days or an automatic
        refund. The fee goes to GatekeeperAI, never to the executive; executives can donate it to charity instead.
      </div>
    </div>
  );
}
