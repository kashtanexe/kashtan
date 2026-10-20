import { ACV_BANDS, type ExecPriorities, type HardGateCheck, type HardGateResult, type PitchAnswers } from "@/types/domain";

export interface HardGateInput {
  answers: Pick<PitchAnswers, "acvBand" | "compliance" | "oneLiner" | "proofText" | "proofUrl" | "companyName">;
  priorities: Pick<ExecPriorities, "budgetMinEur" | "budgetMaxEur" | "requiredCompliance" | "dealbreakers">;
  /** Optional extra text, e.g. the original cold email body. */
  extraText?: string;
}

function normalise(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word / whole-phrase, case- and accent-insensitive match. */
export function containsTerm(haystack: string, term: string): boolean {
  const t = normalise(term).trim();
  if (!t) return false;
  const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(t).replace(/\s+/g, "[\\s-]+")}($|[^a-z0-9])`, "i");
  return re.test(normalise(haystack));
}

const canonical = (s: string) => normalise(s).replace(/[^a-z0-9]/g, "");

/**
 * Deterministic gates. They run before (and independently of) the LLM, so a pitch that
 * blows the budget, lacks a required certification or hits a dealbreaker is filtered no
 * matter what its text says.
 */
export function evaluateHardGates(input: HardGateInput): HardGateResult {
  const { answers, priorities } = input;
  const checks: HardGateCheck[] = [];

  // 1. Budget: the bottom of the vendor's ACV band must fit under the exec's ceiling.
  const band = ACV_BANDS.find((b) => b.value === answers.acvBand);
  if (!band) {
    checks.push({ gate: "budget", passed: false, detail: "No ACV band provided" });
  } else {
    const idx = ACV_BANDS.indexOf(band);
    const bandFloor = idx === 0 ? 0 : ACV_BANDS[idx - 1]!.maxEur;
    const max = priorities.budgetMaxEur;
    if (max > 0 && bandFloor >= max) {
      checks.push({
        gate: "budget",
        passed: false,
        detail: `ACV ${band.label} is above the budget ceiling of €${max.toLocaleString("en-IE")}`,
      });
    } else {
      checks.push({ gate: "budget", passed: true, detail: `ACV ${band.label} fits the budget band` });
    }
  }

  // 2. Required compliance: every required item must be self-attested.
  const attested = new Set(answers.compliance.map(canonical));
  const missing = priorities.requiredCompliance.filter((req) => !attested.has(canonical(req)));
  checks.push(
    missing.length > 0
      ? { gate: "compliance", passed: false, detail: `Missing required: ${missing.join(", ")}` }
      : {
          gate: "compliance",
          passed: true,
          detail:
            priorities.requiredCompliance.length > 0
              ? `Attests ${priorities.requiredCompliance.join(", ")}`
              : "No compliance requirements set",
        },
  );

  // 3. Dealbreakers: keyword/phrase hits anywhere in the vendor-provided text.
  const text = [answers.companyName, answers.oneLiner, answers.proofText, answers.proofUrl, input.extraText ?? ""].join("\n");
  const hits = priorities.dealbreakers.filter((d) => containsTerm(text, d));
  checks.push(
    hits.length > 0
      ? { gate: "dealbreaker", passed: false, detail: `Dealbreaker: ${hits.join(", ")}` }
      : { gate: "dealbreaker", passed: true, detail: "No dealbreakers found" },
  );

  const failures = checks.filter((c) => !c.passed);
  return { passed: failures.length === 0, checks, failures };
}
