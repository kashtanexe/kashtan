import { describe, expect, it } from "vitest";
import { containsTerm, evaluateHardGates } from "@/server/scoring/hard-gates";

const priorities = {
  budgetMinEur: 25_000,
  budgetMaxEur: 150_000,
  requiredCompliance: ["ISO 27001", "GDPR DPA"],
  dealbreakers: ["blockchain", "staff augmentation", "crypto"],
};

const good = {
  acvBand: "50-100k" as const,
  compliance: ["ISO 27001", "GDPR DPA", "SOC 2 Type II"],
  oneLiner: "We automate the DORA register of information for EU payment institutions.",
  proofText: "Live at 3 EU payment institutions.",
  proofUrl: "https://example.com",
  companyName: "Tessellate",
};

describe("hard gates", () => {
  it("passes a pitch within budget, with required compliance and no dealbreakers", () => {
    const r = evaluateHardGates({ answers: good, priorities });
    expect(r.passed).toBe(true);
    expect(r.failures).toHaveLength(0);
    expect(r.checks).toHaveLength(3);
  });

  it("fails the budget gate when the ACV band starts above the ceiling", () => {
    const r = evaluateHardGates({ answers: { ...good, acvBand: "gt250k" }, priorities });
    expect(r.passed).toBe(false);
    expect(r.failures.map((f) => f.gate)).toEqual(["budget"]);
  });

  it("allows a band that overlaps the ceiling (€100k–€250k vs €150k)", () => {
    expect(evaluateHardGates({ answers: { ...good, acvBand: "100-250k" }, priorities }).passed).toBe(true);
  });

  it("treats a zero ceiling as 'no budget limit'", () => {
    expect(evaluateHardGates({ answers: { ...good, acvBand: "gt250k" }, priorities: { ...priorities, budgetMaxEur: 0 } }).passed).toBe(true);
  });

  it("fails compliance when a required item is not attested (case/punctuation-insensitive match)", () => {
    const r = evaluateHardGates({ answers: { ...good, compliance: ["iso-27001"] }, priorities });
    expect(r.passed).toBe(false);
    expect(r.failures[0]).toMatchObject({ gate: "compliance" });
    expect(r.failures[0]!.detail).toContain("GDPR DPA");
    expect(r.failures[0]!.detail).not.toContain("ISO 27001");
  });

  it("fails on dealbreaker keywords anywhere in vendor text, including the original email", () => {
    expect(evaluateHardGates({ answers: { ...good, oneLiner: "Identity on a permissioned Blockchain" }, priorities }).failures[0]).toMatchObject({ gate: "dealbreaker" });
    expect(evaluateHardGates({ answers: good, priorities, extraText: "We also offer staff-augmentation." }).passed).toBe(false);
  });

  it("matches whole words only (no false positive on 'cryptography')", () => {
    expect(evaluateHardGates({ answers: { ...good, oneLiner: "Post-quantum cryptography for payment HSMs" }, priorities }).passed).toBe(true);
  });

  it("reports every failing gate", () => {
    const r = evaluateHardGates({ answers: { ...good, acvBand: "gt250k", compliance: [], oneLiner: "crypto custody" }, priorities });
    expect(r.failures.map((f) => f.gate).sort()).toEqual(["budget", "compliance", "dealbreaker"]);
  });

  it("containsTerm is accent-insensitive", () => {
    expect(containsTerm("Sécurité offshore SOC", "securite")).toBe(true);
  });
});
