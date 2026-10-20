import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { PageHeader } from "../../page-header";
import { SettingsTabs } from "../nav";

export const metadata = { title: "Billing" };

export default async function BillingPage() {
  const exec = await getCurrentExec();
  const org = await getRepo().getOrganization(exec.orgId);
  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs active="/app/settings/billing" />
      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">{org?.name}</span>
            <Badge variant="brand">{org?.plan ?? "free"} plan</Badge>
          </div>
          <p>Pro seats are billed per executive per month via Stripe subscriptions. Seat management and invoices will appear here.</p>
          <p className="text-xs text-slate-400">Phase 5 stub: subscription checkout is not wired in this MVP; Fast-Track payments are.</p>
        </CardContent>
      </Card>
    </div>
  );
}
