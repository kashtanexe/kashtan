import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { appUrl } from "@/lib/env";
import { TIMEZONES } from "@/lib/timezones";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { saveProfileAction } from "../../actions";
import { Notice, PageHeader } from "../../page-header";
import { OnboardingSteps } from "../steps";

export const metadata = { title: "Profile" };

export default async function ProfileStep({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const priorities = await getRepo().getCurrentPriorities(exec.id);
  return (
    <div>
      <PageHeader title="Your profile" description="Shown on your public Pitch Me page (except your email)." />
      <OnboardingSteps active={0} done={[Boolean(exec.title), Boolean(priorities), Boolean(exec.onboardedAt)]} />
      {sp.error === "slug" ? <Notice tone="error">That link is taken. Try another.</Notice> : null}
      <Card>
        <CardContent className="p-6">
          <form action={saveProfileAction} className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" defaultValue={exec.fullName} required />
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={exec.title} placeholder="Chief Information Security Officer" />
            </div>
            <div>
              <Label htmlFor="companyName">Company</Label>
              <Input id="companyName" name="companyName" defaultValue={exec.companyName} />
            </div>
            <div>
              <Label htmlFor="companySize">Company size & sector</Label>
              <Input id="companySize" name="companySize" defaultValue={exec.companySize} placeholder="~2,000 employees · EU fintech" />
            </div>
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select id="timezone" name="timezone" defaultValue={exec.timezone}>
                {[...new Set([exec.timezone, ...TIMEZONES])].map((tz) => (
                  <option key={tz}>{tz}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="slug">Pitch Me link</Label>
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 pl-3 text-sm text-slate-500">
                <span className="whitespace-nowrap">{appUrl().replace(/^https?:\/\//, "")}/in/</span>
                <Input id="slug" name="slug" defaultValue={exec.slug} className="rounded-l-none border-0 border-l" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="bio">Note to vendors</Label>
              <Textarea id="bio" name="bio" defaultValue={exec.bio} rows={3} maxLength={400} placeholder="I read every pitch that clears my brief, usually within a week." />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Save & continue</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
