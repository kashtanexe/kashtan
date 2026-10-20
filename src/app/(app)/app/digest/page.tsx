import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentExec } from "@/server/auth";
import { renderDigestForExec } from "@/server/digest/build-digest";
import { localTime } from "@/server/digest/select-due-execs";
import { sendDigestNowAction } from "../actions";
import { EmailFrame } from "../email-frame";
import { PageHeader } from "../page-header";

export const metadata = { title: "Friday digest" };

export default async function DigestPreviewPage() {
  const exec = await getCurrentExec();
  const { data, email } = await renderDigestForExec(exec);
  const lt = localTime(new Date(), exec.timezone);
  return (
    <div>
      <PageHeader
        title="Friday digest"
        description={`Sent every Friday at 08:00 ${exec.timezone} (it's ${String(lt.hour).padStart(2, "0")}:${String(lt.minute).padStart(2, "0")} there now). This is exactly what lands in your inbox.`}
        actions={
          <form action={sendDigestNowAction}>
            <Button type="submit" size="sm">
              <Send className="h-4 w-4" /> Send it to me now
            </Button>
          </form>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Received", data.stats.received],
          ["Briefs", data.stats.submitted],
          ["For you", data.stats.surfaced],
          ["Filtered", data.stats.filtered],
          ["Minutes saved", data.stats.minutesSaved],
        ].map(([k, v]) => (
          <Card key={k as string} className="p-3">
            <div className="text-xl font-bold tabular-nums">{v}</div>
            <div className="text-xs text-slate-500">{k}</div>
          </Card>
        ))}
      </div>
      <Card className="p-3">
        <div className="mb-2 px-1 text-sm">
          <span className="text-slate-500">Subject:</span> <span className="font-medium">{email.subject}</span>
        </div>
        <EmailFrame html={email.html} height={1100} />
      </Card>
    </div>
  );
}
