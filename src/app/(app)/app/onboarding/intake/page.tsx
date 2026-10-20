import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { IntakeSetupGuide } from "@/components/intake-setup-guide";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { forwardingAddress, publicAlias } from "@/lib/email/headers";
import { appUrl, mailDomains } from "@/lib/env";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { saveIntakeAction } from "../../actions";
import { Notice, PageHeader } from "../../page-header";
import { OnboardingSteps } from "../steps";

export const metadata = { title: "Alias & bio link" };

export default async function IntakeStep({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const priorities = await getRepo().getCurrentPriorities(exec.id);
  const link = `${appUrl()}/in/${exec.slug}`;
  return (
    <div>
      <PageHeader title="Your alias & Pitch Me link" description="This is how vendors reach your desk, without us ever touching your mailbox." />
      <OnboardingSteps active={2} done={[Boolean(exec.title), Boolean(priorities), Boolean(exec.onboardedAt)]} />
      {sp.saved ? <Notice>Your vendor desk is live.</Notice> : null}
      {sp.error === "alias" ? <Notice tone="error">That alias is taken.</Notice> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Your channels</CardTitle>
          </CardHeader>
          <CardContent>
            <IntakeSetupGuide forwardAddress={forwardingAddress(exec.aliasLocalPart, exec.aliasSecret)} alias={publicAlias(exec.aliasLocalPart)} pitchLink={link} />
            <Link href={`/in/${exec.slug}`} target="_blank" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
              Preview your Pitch Me page <ExternalLink className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alias & trusted senders</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveIntakeAction} className="space-y-4">
              <div>
                <Label htmlFor="aliasLocalPart">Alias</Label>
                <div className="flex items-center gap-1 text-sm">
                  <Input id="aliasLocalPart" name="aliasLocalPart" defaultValue={exec.aliasLocalPart} />
                  <span className="whitespace-nowrap text-slate-500">@{mailDomains().inbound}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="verifiedAddresses">Addresses you forward from</Label>
                <Textarea id="verifiedAddresses" name="verifiedAddresses" rows={3} defaultValue={exec.verifiedAddresses.join("\n")} />
                <p className="field-hint">Only forwards from these addresses that pass DMARC/DKIM are accepted. Spoofed forwards are dropped.</p>
              </div>
              <Button type="submit" className="w-full">
                {exec.onboardedAt ? "Save" : "Go live"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
