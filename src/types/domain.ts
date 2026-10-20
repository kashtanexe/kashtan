// Core domain types. Field names mirror the Supabase columns (camelCase <-> snake_case).

export type Plan = "free" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: Plan;
  createdAt: string;
}

export interface ExecProfile {
  id: string;
  orgId: string;
  userId: string | null;
  slug: string;
  fullName: string;
  title: string;
  email: string;
  companyName: string;
  companySize: string;
  timezone: string;
  bio: string;
  threshold: number;
  autoUnlock: boolean;
  autoUnlockDailyCap: number;
  calendarUrl: string;
  fastTrackEnabled: boolean;
  fastTrackPriceCents: number;
  currency: string;
  charityEnabled: boolean;
  charityName: string;
  aliasLocalPart: string;
  aliasSecret: string;
  verifiedAddresses: string[];
  onboardedAt: string | null;
  createdAt: string;
}

export const COMPLIANCE_OPTIONS = [
  "SOC 2 Type II",
  "ISO 27001",
  "GDPR DPA",
  "EU data residency",
  "DORA-ready",
  "NIS2",
  "PCI DSS",
  "HIPAA",
] as const;
export type Compliance = (typeof COMPLIANCE_OPTIONS)[number];

export interface ExecPriorities {
  id: string;
  execId: string;
  version: number;
  quarter: string;
  priorities: string[];
  narrative: string;
  budgetMinEur: number;
  budgetMaxEur: number;
  requiredCompliance: string[];
  dealbreakers: string[];
  createdAt: string;
}

export interface Vendor {
  id: string;
  domain: string;
  name: string;
  createdAt: string;
}

export interface VendorContact {
  id: string;
  vendorId: string;
  email: string;
  name: string;
  suppressed: boolean;
  createdAt: string;
}

export const PITCH_STATUSES = [
  "received",
  "challenged",
  "brief_submitted",
  "awaiting_payment",
  "scoring",
  "surfaced",
  "filtered",
  "accepted",
  "passed",
  "expired",
  "refunded",
] as const;
export type PitchStatus = (typeof PITCH_STATUSES)[number];

export type PitchSource = "alias" | "forward" | "link";

export interface Pitch {
  id: string;
  execId: string;
  vendorId: string;
  contactId: string;
  source: PitchSource;
  status: PitchStatus;
  token: string;
  fastTrack: boolean;
  subject: string;
  originalSnippet: string;
  inboundEmailId: string | null;
  slaDeadline: string | null;
  reminderSentAt: string | null;
  challengedAt: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const ACV_BANDS = [
  { value: "lt10k", label: "Under €10k", midpointEur: 7_500, maxEur: 10_000 },
  { value: "10-25k", label: "€10k – €25k", midpointEur: 17_500, maxEur: 25_000 },
  { value: "25-50k", label: "€25k – €50k", midpointEur: 37_500, maxEur: 50_000 },
  { value: "50-100k", label: "€50k – €100k", midpointEur: 75_000, maxEur: 100_000 },
  { value: "100-250k", label: "€100k – €250k", midpointEur: 175_000, maxEur: 250_000 },
  { value: "gt250k", label: "€250k+", midpointEur: 350_000, maxEur: 1_000_000 },
] as const;
export type AcvBand = (typeof ACV_BANDS)[number]["value"];

export const TIMELINES = [
  { value: "this_quarter", label: "Live this quarter" },
  { value: "next_quarter", label: "Next quarter" },
  { value: "6_12_months", label: "6–12 months" },
  { value: "exploratory", label: "Exploratory / no fixed date" },
] as const;
export type Timeline = (typeof TIMELINES)[number]["value"];

export interface PitchAnswers {
  pitchId: string;
  contactName: string;
  companyName: string;
  oneLiner: string;
  acvBand: AcvBand;
  timeline: Timeline;
  compliance: string[];
  proofUrl: string;
  proofText: string;
  createdAt: string;
}

export interface HardGateCheck {
  gate: "budget" | "compliance" | "dealbreaker";
  passed: boolean;
  detail: string;
}

export interface HardGateResult {
  passed: boolean;
  checks: HardGateCheck[];
  failures: HardGateCheck[];
}

export interface SubScores {
  problemFit: number; // 0-25
  timing: number; // 0-25
  proof: number; // 0-25
  readiness: number; // 0-25
}

export type RecommendedAction = "accept" | "review" | "pass";

export interface PitchScore {
  pitchId: string;
  hardGates: HardGateResult;
  subScores: SubScores;
  total: number;
  tldr: string[];
  pros: string[];
  cons: string[];
  recommendedAction: RecommendedAction;
  rationale: string;
  injectionSuspected: boolean;
  scorer: "claude" | "heuristic";
  model: string;
  promptVersion: string;
  prioritiesVersion: number;
  createdAt: string;
}

export const PASS_REASONS = [
  { value: "not_priority", label: "Not a priority this quarter" },
  { value: "have_solution", label: "Already have a solution" },
  { value: "budget", label: "No budget for this" },
  { value: "wrong_person", label: "Wrong person / team" },
  { value: "not_credible", label: "Not convinced by the proof" },
] as const;
export type PassReason = (typeof PASS_REASONS)[number]["value"];

export interface Decision {
  id: string;
  pitchId: string;
  execId: string;
  action: "accept" | "pass";
  reasonCode: PassReason | null;
  note: string;
  decidedAt: string;
}

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Payment {
  id: string;
  pitchId: string;
  provider: "stripe" | "demo";
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  charity: boolean;
  slaDeadline: string | null;
  refundId: string | null;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}

export type RouteType = "exec_forward" | "direct_to_alias" | "vendor_reply" | "unknown";

export interface InboundEmail {
  id: string;
  providerMessageId: string;
  execId: string | null;
  routeType: RouteType;
  fromEmail: string;
  toEmail: string;
  subject: string;
  originalSenderEmail: string | null;
  extractionMethod: string | null;
  authVerdict: string;
  outcome: string; // e.g. "challenge_sent", "dropped:loop_guard"
  note: string;
  receivedAt: string;
}

export interface OutboxEmail {
  id: string;
  kind: string;
  pitchId: string | null;
  execId: string | null;
  from: string;
  to: string;
  replyTo: string | null;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  stream: string;
  provider: "postmark" | "demo";
  providerMessageId: string | null;
  createdAt: string;
}

export interface DigestRun {
  id: string;
  execId: string;
  weekKey: string;
  sentAt: string;
  stats: Record<string, number>;
}

export interface Suppression {
  email: string;
  reason: string;
  createdAt: string;
}

/** A pitch with everything the UI needs. */
export interface PitchView {
  pitch: Pitch;
  vendor: Vendor;
  contact: VendorContact;
  answers: PitchAnswers | null;
  score: PitchScore | null;
  decision: Decision | null;
  payment: Payment | null;
}
