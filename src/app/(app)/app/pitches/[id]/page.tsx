import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, CircleDot, ExternalLink, FastForward, Users } from "lucide-react";
import { BaseballCard } from "@/components/baseball-card";
import { DecisionButtons } from "@/components/decision-buttons";
import { SubScoreBar } from "@/components/score-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildBookingLink } from "@/lib/calendar";
import { isDemoMode } from "@/lib/env";
import { formatDate, formatEur } from "@/lib/utils";
import { getCurrentExec } from "@/server/auth";
import { STATUS_LABEL } from "@/server/pitches/state-machine";
import { getPitchView } from "@/server/pitches/views";
import { getRepo } from "@/server/repo";
import { colleaguesPitchedBy } from "@/server/vendors/team-history";
import { fastForwardSlaAction, promoteAction } from "../../actions";
import { Notice } from "../../page-header";

export const metadata = { title: "Pitch" };

export default async function PitchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ decided?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const exec = await getCurrentExec();
  const view = await getPitchView(id);
  if (!view || view.pitch.execId !== exec.id) notFound();
  const { pitch, score, answers, decision, payment, contact, vendor } = view;
  const colleagues = await colleaguesPitchedBy(vendor.id, exec);
  const inbound = pitch.inboundEmailId ? (await getRepo().listInbound(exec.id)).find((i) => i.id === pitch.inboundEmailId) : null;
  const tz = exec.timezone;

  const timeline = [
    { at: pitch.createdAt, label: pitch.source === "link" ? "Vendor started a pitch via your link" : pitch.source === "forward" ? "You forwarded a cold email" : "Vendor emailed your alias" },
    pitch.challengedAt && pitch.source !== "link" ? { at: pitch.challengedAt, label: `Challenge sent to ${contact.email}` } : null,
    pitch.submittedAt ? { at: pitch.submittedAt, label: "Vendor completed the brief" } : null,
    payment?.paidAt ? { at: payment.paidAt, label: `Fast-Track paid (${formatEur(payment.amountCents, payment.currency)})` } : null,
    score ? { at: score.createdAt, label: `Scored ${score.total}/100 by ${score.scorer === "claude" ? score.model : "heuristic scorer"}` } : null,
    decision ? { at: decision.decidedAt, label: decision.action === "accept" ? "You accepted; calendar link sent" : "You passed; vendor notified" } : null,
    payment?.refundedAt ? { at: payment.refundedAt, label: "SLA missed: refunded automatically" } : null,
  ].filter((x): x is { at: string; label: string } => Boolean(x));

  const bookingLink = decision?.action === "accept" ? buildBookingLink(exec.calendarUrl, { name: answers?.contactName ?? contact.name, email: contact.email, company: answers?.companyName ?? vendor.name }) : null;

  return (
    <div>
      <Link href="/app" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Inbox
      </Link>
      {sp.decided === "accepted" ? (
        <Notice>
          Accepted. {answers?.contactName ?? contact.name} received your booking link.{" "}
          {isDemoMode() ? (
            <Link href="/app/outbox" className="font-medium underline">
              See the email in the Outbox
            </Link>
          ) : null}
        </Notice>
      ) : null}
      {sp.decided === "passed" ? <Notice>Passed. The vendor received your one-line reason.</Notice> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <BaseballCard view={view} colleagues={colleagues.length} showActions={false} />

          {score ? (
            <Card>
              <CardHeader>
                <CardTitle>Scorecard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SubScoreBar label="Problem fit" value={score.subScores.problemFit} />
                  <SubScoreBar label="Timing" value={score.subScores.timing} />
                  <SubScoreBar label="Proof" value={score.subScores.proof} />
                  <SubScoreBar label="Readiness" value={score.subScores.readiness} />
                </div>
                <p className="text-sm text-slate-600">{score.rationale}</p>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Hard gates (deterministic)</div>
                  <ul className="space-y-1.5">
                    {score.hardGates.checks.map((c) => (
                      <li key={c.gate} className="flex items-center gap-2 text-sm">
                        {c.passed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-rose-600" />}
                        <span className="w-24 font-medium capitalize text-slate-700">{c.gate}</span>
                        <span className="text-slate-600">{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>Scorer: {score.scorer === "claude" ? score.model : "heuristic fallback (no API key)"}</span>·<span>Prompt {score.promptVersion}</span>·
                  <span>Priorities v{score.prioritiesVersion}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {answers ? (
            <Card>
              <CardHeader>
                <CardTitle>The brief</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Proof</div>
                  <p className="mt-1 text-slate-700">{answers.proofText}</p>
                  {answers.proofUrl ? (
                    <a href={answers.proofUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 text-brand-700 hover:underline">
                      {answers.proofUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {pitch.originalSnippet && pitch.source !== "link" ? (
            <Card>
              <CardHeader>
                <CardTitle>Original cold email</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium text-slate-800">{pitch.subject}</div>
                <p className="mt-2 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{pitch.originalSnippet}</p>
                {inbound ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Intake: {inbound.routeType.replace(/_/g, " ")} · sender found via {inbound.extractionMethod ?? "n/a"} · auth {inbound.authVerdict || "n/a"}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="dark">{STATUS_LABEL[pitch.status]}</Badge>
              {pitch.status === "surfaced" || pitch.status === "filtered" ? (
                score ? (
                  <DecisionButtons pitchId={pitch.id} />
                ) : null
              ) : decision ? (
                <div className="text-sm text-slate-600">
                  {decision.action === "accept" ? "Accepted" : "Passed"} on {formatDate(decision.decidedAt, tz)}
                  {bookingLink ? (
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-brand-700 hover:underline">
                      {bookingLink}
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nothing to decide yet.</p>
              )}
              {pitch.status === "filtered" ? (
                <form action={promoteAction}>
                  <input type="hidden" name="pitchId" value={pitch.id} />
                  <Button variant="ghost" size="sm" type="submit">
                    Move to inbox instead
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          {payment ? (
            <Card>
              <CardHeader>
                <CardTitle>Fast-Track</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-600">
                <div>
                  {formatEur(payment.amountCents, payment.currency)} · <Badge variant={payment.status === "refunded" ? "warning" : "success"}>{payment.status}</Badge>
                  {payment.provider === "demo" ? <span className="ml-1 text-xs text-slate-400">(simulated)</span> : null}
                </div>
                {payment.slaDeadline ? <div>Review due by {formatDate(payment.slaDeadline, tz)}</div> : null}
                <div className="text-xs text-slate-500">Paid to FILTR{payment.charity ? " and donated to charity" : ""}, never to you. Auto-refund if not reviewed in 7 days.</div>
                {isDemoMode() && payment.status === "paid" && pitch.status === "surfaced" ? (
                  <form action={fastForwardSlaAction} className="pt-2">
                    <input type="hidden" name="pitchId" value={pitch.id} />
                    <Button variant="outline" size="sm" type="submit">
                      <FastForward className="h-4 w-4" /> Demo: skip 7 days (trigger refund)
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {timeline.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    <div>
                      <div className="text-slate-700">{t.label}</div>
                      <div className="text-xs text-slate-400">{formatDate(t.at, tz)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {colleagues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" /> Also pitched
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {colleagues.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span>{c.name}</span>
                    <Badge variant="outline">{STATUS_LABEL[c.status]}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
