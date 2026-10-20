/**
 * Scoring eval: golden + adversarial pitches against the demo exec profile.
 * Runs against Claude when ANTHROPIC_API_KEY is set, otherwise against the heuristic scorer.
 * Run before changing prompts or models:  npm run eval
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createSeed } from "@/server/repo/demo-seed";
import { scorePitch } from "@/server/scoring/score-pitch";
import { decideOutcome } from "@/server/scoring/threshold";
import type { PitchAnswers } from "@/types/domain";

interface Golden {
  id: string;
  expect: { minTotal?: number; maxTotal?: number; surfaced?: boolean; injection?: boolean };
  answers: Omit<PitchAnswers, "pitchId" | "createdAt">;
}

const golden = JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/pitches/golden.json"), "utf8")) as Golden[];
const seed = createSeed();
const exec = seed.execs[0]!;
const priorities = seed.priorities.find((p) => p.version === 2)!;

describe(`scoring eval (${process.env.ANTHROPIC_API_KEY ? "claude" : "heuristic"})`, () => {
  for (const g of golden) {
    it(g.id, { timeout: 90_000 }, async () => {
      const s = await scorePitch({ pitchId: g.id, exec, priorities, answers: { ...g.answers, pitchId: g.id, createdAt: new Date().toISOString() } as PitchAnswers });
      if (g.expect.minTotal !== undefined) expect(s.total).toBeGreaterThanOrEqual(g.expect.minTotal);
      if (g.expect.maxTotal !== undefined) expect(s.total).toBeLessThanOrEqual(g.expect.maxTotal);
      if (g.expect.surfaced !== undefined) expect(decideOutcome(s, exec.threshold, false) === "surfaced").toBe(g.expect.surfaced);
      if (g.expect.injection) expect(s.injectionSuspected).toBe(true);
    });
  }
});
