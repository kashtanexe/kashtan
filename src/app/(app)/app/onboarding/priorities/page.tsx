import { PrioritiesEditor } from "@/components/priorities-editor";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { Notice, PageHeader } from "../../page-header";
import { OnboardingSteps } from "../steps";

export const metadata = { title: "Priorities" };

export default async function PrioritiesStep({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const priorities = await getRepo().getCurrentPriorities(exec.id);
  return (
    <div>
      <PageHeader title="Your quarterly brief" description="Private. This is what the AI scores every pitch against. It's versioned, so you can see which version scored what." />
      <OnboardingSteps active={1} done={[Boolean(exec.title), Boolean(priorities), Boolean(exec.onboardedAt)]} />
      {sp.saved ? (
        <Notice>
          Saved as v{priorities?.version}.{" "}
          <a className="font-medium underline" href="/app/onboarding/intake">
            Next: your alias & link →
          </a>
        </Notice>
      ) : null}
      {sp.error ? <Notice tone="error">{sp.error}</Notice> : null}
      <Card>
        <CardContent className="p-6">
          <PrioritiesEditor current={priorities} back="/app/onboarding/priorities" submitLabel="Save priorities" />
        </CardContent>
      </Card>
    </div>
  );
}
