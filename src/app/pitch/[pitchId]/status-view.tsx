import { CheckCircle2, Circle, CircleDot, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { ExecProfile, PitchView } from "@/types/domain";

/** What the vendor sees. Never shows the score or the exec's priorities. */
export function VendorStatus({ view, exec }: { view: PitchView; exec: ExecProfile }) {
  const s = view.pitch.status;
  const first = exec.fullName.split(" ")[0];
  const steps = [
    { label: "Brief received", done: true },
    { label: view.pitch.fastTrack ? "Fast-Track confirmed" : "Matched against priorities", done: !["challenged", "brief_submitted", "awaiting_payment", "scoring"].includes(s) },
    { label: `${first} decides`, done: ["accepted", "passed", "refunded", "expired"].includes(s) },
  ];
  const headline =
    s === "accepted"
      ? `${first} would like to meet. Check your email for the booking link.`
      : s === "passed"
        ? `${first} reviewed your brief and is passing for now.`
        : s === "refunded"
          ? "The review window passed, so your Fast-Track fee was refunded automatically."
          : s === "awaiting_payment"
            ? "Waiting for your Fast-Track payment."
            : s === "filtered"
              ? `Thanks. Your brief doesn't match ${first}'s current priorities closely enough to be shown right now. Priorities change every quarter.`
              : view.pitch.fastTrack
                ? `${first} will personally review your pitch${view.pitch.slaDeadline ? ` by ${formatDate(view.pitch.slaDeadline, exec.timezone)}` : ""}, or you're refunded automatically.`
                : `Your brief is with ${first}. You'll hear back by email.`;
  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {view.pitch.fastTrack ? (
            <Badge variant="brand">
              <Zap className="h-3 w-3" /> Fast-Track
            </Badge>
          ) : null}
          {view.payment?.status === "refunded" ? <Badge variant="warning">Refunded</Badge> : null}
        </div>
        <p className="text-lg font-medium leading-snug text-slate-900">{headline}</p>
        <ol className="space-y-3">
          {steps.map((st, i) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              {st.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : i === steps.findIndex((x) => !x.done) ? <CircleDot className="h-5 w-5 text-brand-500" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <span className={st.done ? "text-slate-900" : "text-slate-500"}>{st.label}</span>
            </li>
          ))}
        </ol>
        {view.answers ? (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your one-liner</div>
            <p className="mt-1">“{view.answers.oneLiner}”</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
