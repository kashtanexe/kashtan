import { notFound } from "next/navigation";
import { CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { features } from "@/lib/env";
import { formatEur } from "@/lib/utils";
import { canAccessPitch } from "@/server/pitches/access";
import { getRepo } from "@/server/repo";
import { VendorShell } from "../../../vendor-shell";
import { completeDemoPaymentAction } from "../actions";

export const metadata = { title: "Fast-Track checkout (simulated)" };

/** Demo-mode stand-in for Stripe Checkout. Disabled when Stripe keys are configured. */
export default async function DemoCheckoutPage({ params, searchParams }: { params: Promise<{ pitchId: string }>; searchParams: Promise<{ session?: string; t?: string }> }) {
  const { pitchId } = await params;
  const sp = await searchParams;
  if (features.stripe() || !sp.session || !canAccessPitch(pitchId, sp.t)) notFound();
  const repo = getRepo();
  const payment = await repo.getPaymentBySession(sp.session);
  const pitch = await repo.getPitch(pitchId);
  if (!payment || !pitch || payment.pitchId !== pitchId) notFound();
  const exec = (await repo.getExec(pitch.execId))!;
  const action = completeDemoPaymentAction.bind(null, pitchId, sp.session, sp.t ?? "");
  return (
    <VendorShell>
      <Card className="mx-auto max-w-md">
        <CardContent className="space-y-5 p-6">
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
            Simulated checkout (demo mode). With STRIPE_SECRET_KEY set, this is a real Stripe Checkout page.
          </div>
          <div>
            <div className="text-sm text-slate-500">Fast-Track review by {exec.fullName}</div>
            <div className="text-3xl font-bold">{formatEur(payment.amountCents, payment.currency)}</div>
            <div className="mt-1 text-xs text-slate-500">Guaranteed personal review within 7 days, or an automatic refund. Paid to GatekeeperAI, never to the executive.</div>
          </div>
          <form action={action} className="space-y-3">
            <div className="relative">
              <CreditCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input defaultValue="4242 4242 4242 4242" className="pl-9 font-mono" readOnly />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input defaultValue="12 / 29" readOnly className="font-mono" />
              <Input defaultValue="123" readOnly className="font-mono" />
            </div>
            <Button type="submit" size="lg" className="w-full">
              <Lock className="h-4 w-4" /> Pay {formatEur(payment.amountCents, payment.currency)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </VendorShell>
  );
}
