import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isDemoMode } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { getRepo } from "@/server/repo";
import { EmailFrame } from "../email-frame";
import { Notice, PageHeader } from "../page-header";

export const metadata = { title: "Outbox" };

export default async function OutboxPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const emails = (await getRepo().listOutbox(60)).filter((e) => !e.execId || e.execId === exec.id);
  return (
    <div>
      <PageHeader
        title={isDemoMode() ? "Outbox (demo)" : "Sent emails"}
        description={
          isDemoMode()
            ? "No email provider is configured, so nothing is actually sent. Every email the system would send is captured here, headers included."
            : "Log of emails sent through Postmark."
        }
      />
      {sp.sent === "digest" ? <Notice>Digest sent. It's at the top of the list.</Notice> : null}
      <div className="space-y-3">
        {emails.length === 0 ? <Card className="p-8 text-center text-sm text-slate-500">No emails yet.</Card> : null}
        {emails.map((e, idx) => (
          <Card key={e.id} className="overflow-hidden">
            <details open={idx === 0}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 hover:bg-slate-50">
                <Badge variant={e.kind === "challenge" ? "brand" : e.kind.includes("digest") ? "success" : "outline"}>{e.kind.replace(/_/g, " ")}</Badge>
                <span className="font-medium text-slate-900">{e.subject}</span>
                <span className="text-sm text-slate-500">→ {e.to}</span>
                <span className="ml-auto text-xs text-slate-400">{formatDate(e.createdAt, exec.timezone)}</span>
              </summary>
              <div className="space-y-3 border-t border-slate-100 p-4">
                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[110px_1fr]">
                  <dt className="text-slate-500">From</dt>
                  <dd className="font-mono text-slate-700">{e.from}</dd>
                  <dt className="text-slate-500">To</dt>
                  <dd className="font-mono text-slate-700">{e.to}</dd>
                  {e.replyTo ? (
                    <>
                      <dt className="text-slate-500">Reply-To</dt>
                      <dd className="font-mono text-slate-700">{e.replyTo}</dd>
                    </>
                  ) : null}
                  {Object.entries(e.headers).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="font-mono text-slate-700">{v}</dd>
                    </div>
                  ))}
                  <dt className="text-slate-500">Stream</dt>
                  <dd className="font-mono text-slate-700">
                    {e.stream} · {e.provider}
                  </dd>
                </dl>
                <EmailFrame html={e.html} height={e.kind.includes("digest") ? 900 : 520} />
              </div>
            </details>
          </Card>
        ))}
      </div>
    </div>
  );
}
