import { features, models } from "@/lib/env";
import { getAnthropic } from "@/lib/ai/anthropic";
import { logger } from "@/lib/logger";
import {
  ACV_BANDS,
  TIMELINES,
  type ExecPriorities,
  type ExecProfile,
  type PitchAnswers,
  type PitchScore,
  type RecommendedAction,
  type SubScores,
} from "@/types/domain";
import { evaluateHardGates } from "./hard-gates";
import { PROMPT_VERSION, SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { ScoreOutputSchema, clampSub } from "./schema";

export interface ScoreInput {
  pitchId: string;
  exec: Pick<ExecProfile, "title" | "companyName" | "companySize">;
  priorities: ExecPriorities;
  answers: PitchAnswers;
  originalEmail?: string;
  now?: Date;
}

// ---------------------------------------------------------------------------
// Prompt-injection detection (deterministic, runs on every path)
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS = [
  /ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|prompts?|rules)/i,
  /disregard (all |any )?(the )?(previous|prior|above) /i,
  /\b(score|rate) (this|me|us|it) (a )?(100|10\/10|perfect|maximum)/i,
  /\byou are now\b/i,
  /\bsystem prompt\b/i,
  /\bnew instructions?\s*:/i,
  /<\/?\s*(system|vendor_pitch|exec_profile|instructions?)\b/i,
  /\bas an ai (language )?model\b/i,
  /\bjailbreak\b/i,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((re) => re.test(text));
}

// ---------------------------------------------------------------------------
// Heuristic fallback scorer (no API key). Deterministic and explainable.
// ---------------------------------------------------------------------------

const STOPWORDS = new Set(
  "the and for with from that this into over your our their what when where which while about across within without than then them they have has will would could should must also more most less such only very each other some many much like just real time based using used make made sure need needs plus".split(
    " ",
  ),
);

export function keywords(s: string): string[] {
  return [
    ...new Set(
      s
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => (w.length >= 4 || /^(mfa|sso|ai|llm|soc|siem|edr|xdr|iam|dlp|pam|dora|nis2|tlpt|ict|api)$/.test(w)) && !STOPWORDS.has(w))
        .map((w) => (w.length > 5 && w.endsWith("s") ? w.slice(0, -1) : w)),
    ),
  ];
}

function priorityMatch(priorities: string[], text: string): { best: string | null; coverage: number } {
  const textWords = new Set(keywords(text));
  let best: string | null = null;
  let coverage = 0;
  for (const p of priorities) {
    const kw = keywords(p);
    if (kw.length === 0) continue;
    const hits = kw.filter((k) => textWords.has(k)).length;
    const c = hits / Math.min(kw.length, 5);
    if (c > coverage) {
      coverage = c;
      best = p;
    }
  }
  return { best, coverage: Math.min(1, coverage) };
}

export function heuristicScore(input: ScoreInput, injection: boolean) {
  const { answers, priorities } = input;
  const pitchText = [answers.oneLiner, answers.proofText, input.originalEmail ?? ""].join("\n");
  const { best, coverage } = priorityMatch(priorities.priorities, pitchText);

  const problemFit = clampSub(best ? 6 + coverage * 24 : 3);
  const timing = clampSub({ this_quarter: 23, next_quarter: 17, "6_12_months": 10, exploratory: 5 }[answers.timeline] ?? 8);

  let proof = 3;
  if (/^https?:\/\/\S+\.\S+/.test(answers.proofUrl)) proof += 6;
  if (/\d+\s?(%|x|weeks?|days?|hours?|k|m)\b/i.test(answers.proofText)) proof += 6;
  if (/\b(customers?|clients?|live at|used by|deployed at|banks?|insurers?|fintechs?|payment)\b/i.test(answers.proofText)) proof += 5;
  if (answers.proofText.length > 120) proof += 4;

  const band = ACV_BANDS.find((b) => b.value === answers.acvBand);
  let readiness = 6 + Math.min(12, answers.compliance.length * 3);
  if (band && band.midpointEur >= priorities.budgetMinEur && band.midpointEur <= priorities.budgetMaxEur) readiness += 5;
  if (answers.compliance.includes("EU data residency")) readiness += 2;

  let sub: SubScores = {
    problemFit,
    timing,
    proof: clampSub(proof),
    readiness: clampSub(readiness),
  };
  if (injection) sub = { ...sub, problemFit: Math.min(sub.problemFit, 5), proof: Math.min(sub.proof, 5) };

  const timelineLabel = TIMELINES.find((t) => t.value === answers.timeline)?.label ?? answers.timeline;
  const pros: string[] = [];
  const cons: string[] = [];
  if (best && coverage >= 0.4) pros.push(`Directly targets your priority: “${best}”`);
  else cons.push("No clear link to your stated priorities");
  if (answers.timeline === "this_quarter") pros.push("Can go live this quarter");
  if (answers.timeline === "exploratory") cons.push("No concrete timeline");
  if (sub.proof >= 15) pros.push("Concrete, checkable proof provided");
  else cons.push("Thin proof: no named customers or metrics");
  if (answers.compliance.length >= 3) pros.push(`Self-attests ${answers.compliance.slice(0, 3).join(", ")}`);
  if (injection) cons.unshift("Pitch text tries to manipulate the scoring (prompt injection)");

  return {
    sub,
    tldr: [
      `${answers.companyName}: ${answers.oneLiner}`.slice(0, 140),
      best && coverage >= 0.4
        ? `Fits “${best.slice(0, 60)}” · ${timelineLabel} · ${band?.label ?? ""}`
        : `Weak fit with your ${priorities.quarter} priorities · ${timelineLabel}`,
    ],
    pros: pros.slice(0, 3),
    cons: cons.slice(0, 3),
    rationale: best
      ? `Best match is “${best}” (${Math.round(coverage * 100)}% keyword coverage); timing ${timelineLabel.toLowerCase()}.`
      : "No overlap with the current priorities.",
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

function actionFor(total: number, gatesPassed: boolean, injection: boolean): RecommendedAction {
  if (!gatesPassed || injection) return "pass";
  if (total >= 85) return "accept";
  if (total >= 60) return "review";
  return "pass";
}

export async function scorePitch(input: ScoreInput): Promise<PitchScore> {
  const now = input.now ?? new Date();
  const hardGates = evaluateHardGates({ answers: input.answers, priorities: input.priorities, extraText: input.originalEmail });
  const injection = detectInjection(
    [input.answers.companyName, input.answers.oneLiner, input.answers.proofText, input.answers.proofUrl, input.originalEmail ?? ""].join("\n"),
  );

  let sub: SubScores;
  let tldr: string[];
  let pros: string[];
  let cons: string[];
  let rationale: string;
  let scorer: PitchScore["scorer"] = "heuristic";
  let model = "heuristic-v1";
  let injectionSuspected = injection;

  const claude = features.anthropic() ? await scoreWithClaude(input) : null;
  if (claude) {
    scorer = "claude";
    model = models().scoring;
    injectionSuspected = injection || claude.injection_suspected;
    sub = {
      problemFit: clampSub(claude.sub_scores.problem_fit),
      timing: clampSub(claude.sub_scores.timing),
      proof: clampSub(claude.sub_scores.proof),
      readiness: clampSub(claude.sub_scores.readiness),
    };
    if (injectionSuspected) sub = { ...sub, problemFit: Math.min(sub.problemFit, 5), proof: Math.min(sub.proof, 5) };
    tldr = claude.tldr.slice(0, 2);
    pros = claude.pros.slice(0, 3);
    cons = claude.cons.slice(0, 3);
    rationale = claude.rationale;
  } else {
    const h = heuristicScore(input, injection);
    ({ sub, tldr, pros, cons, rationale } = h);
  }

  let total = sub.problemFit + sub.timing + sub.proof + sub.readiness;
  if (!hardGates.passed) total = Math.min(total, 39);
  if (injectionSuspected) total = Math.min(total, 30);

  return {
    pitchId: input.pitchId,
    hardGates,
    subScores: sub,
    total,
    tldr,
    pros,
    cons,
    recommendedAction: actionFor(total, hardGates.passed, injectionSuspected),
    rationale,
    injectionSuspected,
    scorer,
    model,
    promptVersion: PROMPT_VERSION,
    prioritiesVersion: input.priorities.version,
    createdAt: now.toISOString(),
  };
}

async function scoreWithClaude(input: ScoreInput) {
  try {
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
    const res = await getAnthropic().messages.parse({
      model: models().scoring,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(input) }],
      output_config: { format: zodOutputFormat(ScoreOutputSchema), effort: "low" },
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      logger.warn("claude scoring returned no parsed output", { stop: res.stop_reason });
      return null;
    }
    return ScoreOutputSchema.parse(res.parsed_output);
  } catch (err) {
    logger.error("claude scoring failed; falling back to heuristic", { err: String(err) });
    return null;
  }
}
