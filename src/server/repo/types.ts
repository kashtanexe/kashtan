import type {
  Decision,
  DigestRun,
  ExecPriorities,
  ExecProfile,
  InboundEmail,
  Organization,
  OutboxEmail,
  Payment,
  Pitch,
  PitchAnswers,
  PitchScore,
  PitchStatus,
  Suppression,
  Vendor,
  VendorContact,
} from "@/types/domain";

export interface PitchFilter {
  execId?: string;
  execIds?: string[];
  statuses?: PitchStatus[];
  vendorId?: string;
  fastTrack?: boolean;
}

/**
 * Storage boundary. Two implementations:
 *  - DemoRepository: in-memory, seeded, persisted to a JSON file (zero keys needed)
 *  - SupabaseRepository: Postgres via the service-role client (used when keys exist)
 * Authorisation (which exec may see what) is enforced by the callers in src/server and
 * src/app, and again by RLS for any non-service-role access.
 */
export interface Repository {
  readonly kind: "demo" | "supabase";

  // Organisations & execs
  getOrganization(id: string): Promise<Organization | null>;
  createOrganization(input: Omit<Organization, "id" | "createdAt">): Promise<Organization>;
  getExec(id: string): Promise<ExecProfile | null>;
  getExecBySlug(slug: string): Promise<ExecProfile | null>;
  getExecByAlias(localPart: string): Promise<ExecProfile | null>;
  getExecByUserId(userId: string): Promise<ExecProfile | null>;
  listExecs(orgId?: string): Promise<ExecProfile[]>;
  createExec(input: Omit<ExecProfile, "id" | "createdAt">): Promise<ExecProfile>;
  updateExec(id: string, patch: Partial<ExecProfile>): Promise<ExecProfile>;

  // Priorities (versioned)
  getCurrentPriorities(execId: string): Promise<ExecPriorities | null>;
  listPriorities(execId: string): Promise<ExecPriorities[]>;
  savePriorities(execId: string, input: Omit<ExecPriorities, "id" | "execId" | "version" | "createdAt">): Promise<ExecPriorities>;

  // Vendors
  upsertVendorContact(input: { email: string; name: string; companyName: string }): Promise<{ vendor: Vendor; contact: VendorContact }>;
  getVendor(id: string): Promise<Vendor | null>;
  getContact(id: string): Promise<VendorContact | null>;
  listVendors(): Promise<Vendor[]>;
  addSuppression(email: string, reason: string): Promise<void>;
  isSuppressed(email: string): Promise<boolean>;
  listSuppressions(): Promise<Suppression[]>;

  // Pitches
  createPitch(input: Omit<Pitch, "id" | "createdAt" | "updatedAt">): Promise<Pitch>;
  getPitch(id: string): Promise<Pitch | null>;
  getPitchByToken(token: string): Promise<Pitch | null>;
  updatePitch(id: string, patch: Partial<Pitch>): Promise<Pitch>;
  listPitches(filter?: PitchFilter): Promise<Pitch[]>;
  saveAnswers(answers: PitchAnswers): Promise<void>;
  getAnswers(pitchId: string): Promise<PitchAnswers | null>;
  saveScore(score: PitchScore): Promise<void>;
  getScore(pitchId: string): Promise<PitchScore | null>;
  saveDecision(decision: Omit<Decision, "id">): Promise<Decision>;
  getDecision(pitchId: string): Promise<Decision | null>;
  listDecisions(execId: string): Promise<Decision[]>;

  // Payments
  createPayment(input: Omit<Payment, "id" | "createdAt">): Promise<Payment>;
  updatePayment(id: string, patch: Partial<Payment>): Promise<Payment>;
  getPaymentByPitch(pitchId: string): Promise<Payment | null>;
  getPaymentBySession(sessionId: string): Promise<Payment | null>;
  listPayments(filter?: { status?: Payment["status"] }): Promise<Payment[]>;

  // Intake & email
  findInboundByProviderId(providerMessageId: string): Promise<InboundEmail | null>;
  saveInbound(input: Omit<InboundEmail, "id">): Promise<InboundEmail>;
  updateInbound(id: string, patch: Partial<InboundEmail>): Promise<InboundEmail>;
  listInbound(execId?: string): Promise<InboundEmail[]>;
  lastChallengeAt(execId: string, email: string): Promise<string | null>;
  logOutbox(email: Omit<OutboxEmail, "id" | "createdAt">): Promise<OutboxEmail>;
  listOutbox(limit?: number): Promise<OutboxEmail[]>;
  recordEmailEvent(event: { type: string; email: string; providerMessageId?: string; payload: unknown }): Promise<void>;

  // Digests
  saveDigestRun(run: Omit<DigestRun, "id">): Promise<DigestRun>;
  getDigestRun(execId: string, weekKey: string): Promise<DigestRun | null>;

  /** Demo only: restore the seed. */
  reset?(): Promise<void>;
}
