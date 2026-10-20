import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { PageHeader } from "../page-header";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const exec = await getCurrentExec();
  const priorities = await getRepo().getCurrentPriorities(exec.id);
  const items = [
    { done: Boolean(exec.title && exec.companyName), label: "Tell us who you are", detail: "Name, title, company size, timezone", href: "/app/onboarding/profile" },
    { done: Boolean(priorities), label: "Write your quarterly priorities", detail: "What you'd actually take a meeting about this quarter, budget and dealbreakers", href: "/app/onboarding/priorities" },
    { done: Boolean(exec.onboardedAt), label: "Get your alias and Pitch Me link", detail: "Put the link in your signature; forward what slips through", href: "/app/onboarding/intake" },
  ];
  return (
    <div>
      <PageHeader title="Set up your vendor desk" description="Five minutes. No mailbox access, nothing for IT to approve." />
      <Card>
        <CardContent className="divide-y divide-slate-100 p-0">
          {items.map((it) => (
            <Link key={it.href} href={it.href} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
              {it.done ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-slate-300" />}
              <div className="flex-1">
                <div className="font-medium">{it.label}</div>
                <div className="text-sm text-slate-500">{it.detail}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          ))}
        </CardContent>
      </Card>
      <Link href="/app/onboarding/profile" className={buttonVariants({ className: "mt-6" })}>
        Start <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
