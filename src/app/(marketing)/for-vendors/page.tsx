import Link from "next/link";
import { CheckCircle2, Clock, HeartHandshake, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_SLUG } from "@/server/repo/demo-seed";

export const metadata = { title: "For vendors" };

export default function ForVendorsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Got a reply from a Vendor Desk?</h1>
      <p className="mt-4 text-lg text-slate-600">
        The executive you emailed uses GatekeeperAI to review vendors. Instead of your sequence getting lost, you get a fair, structured shot: a 60-second brief
        that is matched against what they actually need this quarter.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {[
          [CheckCircle2, "The 4 questions", "Your offer in 140 characters · price range & timeline · compliance (self-attested) · one concrete proof point."],
          [ShieldCheck, "Scored on merit", "Hard rules (budget, required certifications, dealbreakers), then a consistent rubric: fit, timing, proof, readiness."],
          [Clock, "Fast-Track, optional", "Pay a small fee for a guaranteed human review within 7 days. If it doesn't happen, you're refunded automatically."],
          [HeartHandshake, "A real answer", "Accepted pitches get the executive's calendar link. Passes come with a one-line reason, so you can stop chasing."],
        ].map(([Icon, t, b]) => {
          const I = Icon as typeof Clock;
          return (
            <div key={t as string} className="rounded-2xl border border-slate-200 p-6">
              <I className="h-6 w-6 text-brand-600" />
              <h3 className="mt-3 font-semibold">{t as string}</h3>
              <p className="mt-1 text-sm text-slate-600">{b as string}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-10 rounded-2xl bg-amber-50 p-6 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
        <strong>Ethics note.</strong> Fast-Track fees are paid to GatekeeperAI, never to the executive, and buy a guaranteed review, not a meeting. Executives can
        choose to donate the fees to charity or disable Fast-Track entirely, in line with corporate gift and anti-bribery policies.
      </div>
      <div className="mt-10">
        <Link href={`/in/${DEMO_SLUG}`} className={buttonVariants({ size: "lg" })}>
          See an example Pitch Me page
        </Link>
      </div>
    </div>
  );
}
