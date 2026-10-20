import Link from "next/link";
import { ArrowUpRight, Ban, CheckCircle2, Forward, Link2, Mail, ShieldAlert, ThumbsDown, ThumbsUp, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DecisionButtons } from "@/components/decision-buttons";
import { ScoreBadge } from "@/components/score-badge";
import { SlaCountdown } from "@/components/sla-countdown";
import { relativeTime } from "@/lib/utils";
import { STATUS_LABEL } from "@/server/pitches/state-machine";
import { ACV_BANDS, PASS_REASONS, TIMELINES, type PitchView } from "@/types/domain";

const SOURCE = {
  forward: { icon: Forward, label: "Forwarded" },
  alias: { icon: Mail, label: "Alias" },
  link: { icon: Link2, label: "Pitch Me link" },
} as const;

const ACTION = {
  accept: { label: "Recommend: take the meeting", variant: "success" as const },
  review: { label: "Recommend: worth a look", variant: "warning" as const },
  pass: { label: "Recommend: pass", variant: "danger" as const },
};

export function BaseballCard({ view, colleagues = 0, showActions = true }: { view: PitchView; colleagues?: number; showActions?: boolean }) {
  const { pitch, vendor, answers, score, decision } = view;
  const Source = SOURCE[pitch.source];
  const acv = ACV_BANDS.find((b) => b.value === answers?.acvBand)?.label;
  const timeline = TIMELINES.find((t) => t.value === answers?.timeline)?.label;
  const decidable = pitch.status === "surfaced" || pitch.status === "filtered";

  return (
    <Card className="overflow-hidden">
      {pitch.fastTrack && pitch.status === "surfaced" ? (
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-1.5 text-xs font-medium text-white">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> Fast-Track · guaranteed review
          </span>
          {pitch.slaDeadline ? <SlaCountdown deadline={pitch.slaDeadline} className="bg-white/95" /> : null}
        </div>
      ) : null}
      <div className="flex gap-4 p-5">
        <ScoreBadge score={score?.total ?? 0} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-900">{answers?.companyName ?? vendor.name}</h3>
            <span className="text-xs text-slate-500">
              {answers?.contactName ?? view.contact.name} · {vendor.domain}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">
              <Source.icon className="h-3 w-3" /> {Source.label}
            </Badge>
            {acv ? <Badge variant="outline">ACV {acv}</Badge> : null}
            {timeline ? <Badge variant="outline">{timeline}</Badge> : null}
            {score ? <Badge variant={ACTION[score.recommendedAction].variant}>{ACTION[score.recommendedAction].label}</Badge> : null}
            {colleagues > 0 ? (
              <Badge variant="brand" title="Pro: shared vendor memory">
                <Users className="h-3 w-3" /> Pitched to {colleagues} colleague{colleagues === 1 ? "" : "s"}
              </Badge>
            ) : null}
            {!decidable ? <Badge variant="dark">{STATUS_LABEL[pitch.status]}</Badge> : null}
          </div>
          {answers ? <p className="mt-3 text-[15px] font-medium leading-snug text-slate-800">“{answers.oneLiner}”</p> : null}
        </div>
      </div>

      {score ? (
        <div className="space-y-4 px-5 pb-5">
          <ul className="space-y-1.5">
            {score.tldr.slice(0, 2).map((t, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {t}
              </li>
            ))}
          </ul>
          {score.hardGates.failures.length > 0 || score.injectionSuspected ? (
            <div className="space-y-1 rounded-lg bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-inset ring-rose-200">
              {score.hardGates.failures.map((f) => (
                <div key={f.gate} className="flex items-center gap-1.5">
                  <Ban className="h-3.5 w-3.5" /> Hard gate ({f.gate}): {f.detail}
                </div>
              ))}
              {score.injectionSuspected ? (
                <div className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> Prompt-injection attempt detected and neutralised
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <ThumbsUp className="h-3.5 w-3.5" /> Pros
              </div>
              <ul className="space-y-1 text-sm text-slate-600">
                {(score.pros.length ? score.pros : ["None identified"]).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
                <ThumbsDown className="h-3.5 w-3.5" /> Cons
              </div>
              <ul className="space-y-1 text-sm text-slate-600">
                {(score.cons.length ? score.cons : ["None identified"]).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          {answers && answers.compliance.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {answers.compliance.map((c) => (
                <Badge key={c} variant="default">
                  <CheckCircle2 className="h-3 w-3 text-slate-500" /> {c}
                </Badge>
              ))}
              <span className="text-[11px] italic text-slate-400">self-attested</span>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="px-5 pb-5 text-sm text-slate-500">Waiting for the vendor to complete the brief.</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        {decision ? (
          <span className="text-sm text-slate-600">
            {decision.action === "accept" ? "Accepted, calendar link sent" : `Passed: ${PASS_REASONS.find((r) => r.value === decision.reasonCode)?.label ?? "no reason"}`} ·{" "}
            {relativeTime(decision.decidedAt)}
          </span>
        ) : showActions && decidable && score ? (
          <DecisionButtons pitchId={pitch.id} back="inbox" className="w-auto" />
        ) : (
          <span className="text-xs text-slate-500">
            {STATUS_LABEL[pitch.status]} · {relativeTime(pitch.createdAt)}
          </span>
        )}
        <Link href={`/app/pitches/${pitch.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
          Details <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </Card>
  );
}
