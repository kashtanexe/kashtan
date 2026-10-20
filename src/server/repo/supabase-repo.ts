import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { randomId } from "@/lib/utils";
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
  Suppression,
  Vendor,
  VendorContact,
} from "@/types/domain";
import type { PitchFilter, Repository } from "./types";

// ---------------------------------------------------------------------------
// camelCase <-> snake_case row mapping
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;
const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (k: string) => k.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

function toRow(obj: object, omit: string[] = []): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || omit.includes(k)) continue;
    out[toSnake(k)] = v;
  }
  return out;
}
function fromRow<T>(row: Row | null | undefined): T | null {
  if (!row) return null;
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}
function fromRows<T>(rows: Row[] | null | undefined): T[] {
  return (rows ?? []).map((r) => fromRow<T>(r)!);
}
function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const EXEC_VIRTUAL = ["aliasLocalPart", "aliasSecret", "verifiedAddresses"];

export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private get db(): SupabaseClient {
    return getSupabaseAdmin();
  }

  // ----- organisations & execs ------------------------------------------------
  async getOrganization(id: string) {
    return fromRow<Organization>(check(await this.db.from("organizations").select("*").eq("id", id).maybeSingle()));
  }
  async createOrganization(input: Omit<Organization, "id" | "createdAt">) {
    return fromRow<Organization>(check(await this.db.from("organizations").insert(toRow(input)).select().single()))!;
  }

  private async hydrateExec(row: Row | null): Promise<ExecProfile | null> {
    if (!row) return null;
    const id = row.id as string;
    const [alias, addrs] = await Promise.all([
      this.db.from("intake_aliases").select("local_part, secret").eq("exec_id", id).maybeSingle(),
      this.db.from("exec_addresses").select("email").eq("exec_id", id),
    ]);
    const exec = fromRow<ExecProfile>(row)!;
    exec.aliasLocalPart = (alias.data?.local_part as string) ?? "";
    exec.aliasSecret = (alias.data?.secret as string) ?? "";
    exec.verifiedAddresses = (addrs.data ?? []).map((a) => a.email as string);
    return exec;
  }
  async getExec(id: string) {
    return this.hydrateExec(check(await this.db.from("exec_profiles").select("*").eq("id", id).maybeSingle()));
  }
  async getExecBySlug(slug: string) {
    return this.hydrateExec(check(await this.db.from("exec_profiles").select("*").eq("slug", slug).maybeSingle()));
  }
  async getExecByAlias(localPart: string) {
    const alias = check(await this.db.from("intake_aliases").select("exec_id").eq("local_part", localPart.toLowerCase()).maybeSingle());
    return alias ? this.getExec(alias.exec_id as string) : null;
  }
  async getExecByUserId(userId: string) {
    return this.hydrateExec(check(await this.db.from("exec_profiles").select("*").eq("user_id", userId).maybeSingle()));
  }
  async listExecs(orgId?: string) {
    let q = this.db.from("exec_profiles").select("*");
    if (orgId) q = q.eq("org_id", orgId);
    const rows = check(await q);
    return (await Promise.all((rows ?? []).map((r) => this.hydrateExec(r)))).filter((e): e is ExecProfile => Boolean(e));
  }
  async createExec(input: Omit<ExecProfile, "id" | "createdAt">) {
    const row = check(await this.db.from("exec_profiles").insert(toRow({ ...input, id: randomId("exec") }, EXEC_VIRTUAL)).select().single());
    const id = row.id as string;
    await this.syncExecVirtuals(id, input);
    return (await this.getExec(id))!;
  }
  private async syncExecVirtuals(id: string, patch: Partial<ExecProfile>) {
    if (patch.aliasLocalPart !== undefined || patch.aliasSecret !== undefined) {
      const current = check(await this.db.from("intake_aliases").select("*").eq("exec_id", id).maybeSingle());
      check(
        await this.db.from("intake_aliases").upsert(
          {
            exec_id: id,
            local_part: patch.aliasLocalPart ?? current?.local_part,
            secret: patch.aliasSecret ?? current?.secret ?? randomId().slice(0, 6),
          },
          { onConflict: "exec_id" },
        ),
      );
    }
    if (patch.verifiedAddresses) {
      check(await this.db.from("exec_addresses").delete().eq("exec_id", id));
      if (patch.verifiedAddresses.length > 0) {
        check(
          await this.db
            .from("exec_addresses")
            .insert(patch.verifiedAddresses.map((email) => ({ exec_id: id, email: email.toLowerCase(), verified_at: new Date().toISOString() }))),
        );
      }
    }
  }
  async updateExec(id: string, patch: Partial<ExecProfile>) {
    const row = toRow(patch, [...EXEC_VIRTUAL, "id", "createdAt"]);
    if (Object.keys(row).length > 0) check(await this.db.from("exec_profiles").update(row).eq("id", id));
    await this.syncExecVirtuals(id, patch);
    return (await this.getExec(id))!;
  }

  // ----- priorities ------------------------------------------------------------
  async getCurrentPriorities(execId: string) {
    return fromRow<ExecPriorities>(
      check(await this.db.from("exec_priorities").select("*").eq("exec_id", execId).order("version", { ascending: false }).limit(1).maybeSingle()),
    );
  }
  async listPriorities(execId: string) {
    return fromRows<ExecPriorities>(check(await this.db.from("exec_priorities").select("*").eq("exec_id", execId).order("version", { ascending: false })));
  }
  async savePriorities(execId: string, input: Omit<ExecPriorities, "id" | "execId" | "version" | "createdAt">) {
    const current = await this.getCurrentPriorities(execId);
    const version = (current?.version ?? 0) + 1;
    return fromRow<ExecPriorities>(
      check(await this.db.from("exec_priorities").insert(toRow({ ...input, id: randomId("prio"), execId, version })).select().single()),
    )!;
  }

  // ----- vendors ---------------------------------------------------------------
  async upsertVendorContact(input: { email: string; name: string; companyName: string }) {
    const email = input.email.toLowerCase();
    const domain = email.split("@")[1] ?? "unknown";
    const freeMail = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|proton|protonmail|gmx|web)\./.test(domain);
    const key = freeMail ? email : domain;
    let vendor = fromRow<Vendor>(check(await this.db.from("vendors").select("*").eq("domain", key).maybeSingle()));
    if (!vendor) {
      vendor = fromRow<Vendor>(
        check(await this.db.from("vendors").insert({ id: randomId("ven"), domain: key, name: input.companyName || domain }).select().single()),
      )!;
    }
    let contact = fromRow<VendorContact>(check(await this.db.from("vendor_contacts").select("*").eq("email", email).maybeSingle()));
    if (!contact) {
      contact = fromRow<VendorContact>(
        check(
          await this.db
            .from("vendor_contacts")
            .insert({ id: randomId("con"), vendor_id: vendor.id, email, name: input.name || email.split("@")[0] })
            .select()
            .single(),
        ),
      )!;
    }
    return { vendor, contact };
  }
  async getVendor(id: string) {
    return fromRow<Vendor>(check(await this.db.from("vendors").select("*").eq("id", id).maybeSingle()));
  }
  async getContact(id: string) {
    return fromRow<VendorContact>(check(await this.db.from("vendor_contacts").select("*").eq("id", id).maybeSingle()));
  }
  async listVendors() {
    return fromRows<Vendor>(check(await this.db.from("vendors").select("*")));
  }
  async addSuppression(email: string, reason: string) {
    const e = email.toLowerCase();
    check(await this.db.from("suppressions").upsert({ email: e, reason }, { onConflict: "email" }));
    check(await this.db.from("vendor_contacts").update({ suppressed: true }).eq("email", e));
  }
  async isSuppressed(email: string) {
    const row = check(await this.db.from("suppressions").select("email").eq("email", email.toLowerCase()).maybeSingle());
    return Boolean(row);
  }
  async listSuppressions() {
    return fromRows<Suppression>(check(await this.db.from("suppressions").select("*")));
  }

  // ----- pitches ---------------------------------------------------------------
  async createPitch(input: Omit<Pitch, "id" | "createdAt" | "updatedAt">) {
    return fromRow<Pitch>(check(await this.db.from("pitches").insert(toRow({ ...input, id: randomId("pit") })).select().single()))!;
  }
  async getPitch(id: string) {
    return fromRow<Pitch>(check(await this.db.from("pitches").select("*").eq("id", id).maybeSingle()));
  }
  async getPitchByToken(token: string) {
    return fromRow<Pitch>(check(await this.db.from("pitches").select("*").eq("token", token).maybeSingle()));
  }
  async updatePitch(id: string, patch: Partial<Pitch>) {
    return fromRow<Pitch>(check(await this.db.from("pitches").update(toRow(patch, ["id", "createdAt", "updatedAt"])).eq("id", id).select().single()))!;
  }
  async listPitches(filter: PitchFilter = {}) {
    let q = this.db.from("pitches").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter.execId) q = q.eq("exec_id", filter.execId);
    if (filter.execIds) q = q.in("exec_id", filter.execIds);
    if (filter.statuses) q = q.in("status", filter.statuses);
    if (filter.vendorId) q = q.eq("vendor_id", filter.vendorId);
    if (filter.fastTrack !== undefined) q = q.eq("fast_track", filter.fastTrack);
    return fromRows<Pitch>(check(await q));
  }
  async saveAnswers(answers: PitchAnswers) {
    check(await this.db.from("pitch_answers").upsert(toRow(answers), { onConflict: "pitch_id" }));
  }
  async getAnswers(pitchId: string) {
    return fromRow<PitchAnswers>(check(await this.db.from("pitch_answers").select("*").eq("pitch_id", pitchId).maybeSingle()));
  }
  async saveScore(score: PitchScore) {
    check(await this.db.from("pitch_scores").upsert(toRow(score), { onConflict: "pitch_id" }));
  }
  async getScore(pitchId: string) {
    return fromRow<PitchScore>(check(await this.db.from("pitch_scores").select("*").eq("pitch_id", pitchId).maybeSingle()));
  }
  async saveDecision(decision: Omit<Decision, "id">) {
    return fromRow<Decision>(
      check(await this.db.from("decisions").upsert(toRow({ ...decision, id: randomId("dec") }), { onConflict: "pitch_id" }).select().single()),
    )!;
  }
  async getDecision(pitchId: string) {
    return fromRow<Decision>(check(await this.db.from("decisions").select("*").eq("pitch_id", pitchId).maybeSingle()));
  }
  async listDecisions(execId: string) {
    return fromRows<Decision>(check(await this.db.from("decisions").select("*").eq("exec_id", execId)));
  }

  // ----- payments --------------------------------------------------------------
  async createPayment(input: Omit<Payment, "id" | "createdAt">) {
    return fromRow<Payment>(check(await this.db.from("payments").insert(toRow({ ...input, id: randomId("pay") })).select().single()))!;
  }
  async updatePayment(id: string, patch: Partial<Payment>) {
    return fromRow<Payment>(check(await this.db.from("payments").update(toRow(patch, ["id", "createdAt"])).eq("id", id).select().single()))!;
  }
  async getPaymentByPitch(pitchId: string) {
    return fromRow<Payment>(
      check(await this.db.from("payments").select("*").eq("pitch_id", pitchId).order("created_at", { ascending: false }).limit(1).maybeSingle()),
    );
  }
  async getPaymentBySession(sessionId: string) {
    return fromRow<Payment>(check(await this.db.from("payments").select("*").eq("checkout_session_id", sessionId).maybeSingle()));
  }
  async listPayments(filter: { status?: Payment["status"] } = {}) {
    let q = this.db.from("payments").select("*");
    if (filter.status) q = q.eq("status", filter.status);
    return fromRows<Payment>(check(await q));
  }

  // ----- intake & email --------------------------------------------------------
  async findInboundByProviderId(providerMessageId: string) {
    return fromRow<InboundEmail>(
      check(await this.db.from("inbound_emails").select("*").eq("provider_message_id", providerMessageId).maybeSingle()),
    );
  }
  async saveInbound(input: Omit<InboundEmail, "id">) {
    return fromRow<InboundEmail>(check(await this.db.from("inbound_emails").insert(toRow({ ...input, id: randomId("inb") })).select().single()))!;
  }
  async updateInbound(id: string, patch: Partial<InboundEmail>) {
    return fromRow<InboundEmail>(check(await this.db.from("inbound_emails").update(toRow(patch, ["id"])).eq("id", id).select().single()))!;
  }
  async listInbound(execId?: string) {
    let q = this.db.from("inbound_emails").select("*").order("received_at", { ascending: false }).limit(200);
    if (execId) q = q.eq("exec_id", execId);
    return fromRows<InboundEmail>(check(await q));
  }
  async lastChallengeAt(execId: string, email: string) {
    const contact = check(await this.db.from("vendor_contacts").select("id").eq("email", email.toLowerCase()).maybeSingle());
    if (!contact) return null;
    const row = check(
      await this.db
        .from("pitches")
        .select("challenged_at")
        .eq("exec_id", execId)
        .eq("contact_id", contact.id)
        .not("challenged_at", "is", null)
        .order("challenged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    return (row?.challenged_at as string) ?? null;
  }
  async logOutbox(email: Omit<OutboxEmail, "id" | "createdAt">) {
    return fromRow<OutboxEmail>(check(await this.db.from("outbox_emails").insert(toRow({ ...email, id: randomId("out") })).select().single()))!;
  }
  async listOutbox(limit = 50) {
    return fromRows<OutboxEmail>(check(await this.db.from("outbox_emails").select("*").order("created_at", { ascending: false }).limit(limit)));
  }
  async recordEmailEvent(event: { type: string; email: string; providerMessageId?: string; payload: unknown }) {
    check(await this.db.from("email_events").insert(toRow(event)));
  }

  // ----- digests ---------------------------------------------------------------
  async saveDigestRun(run: Omit<DigestRun, "id">) {
    return fromRow<DigestRun>(
      check(await this.db.from("digest_runs").upsert(toRow({ ...run, id: randomId("dig") }), { onConflict: "exec_id,week_key" }).select().single()),
    )!;
  }
  async getDigestRun(execId: string, weekKey: string) {
    return fromRow<DigestRun>(check(await this.db.from("digest_runs").select("*").eq("exec_id", execId).eq("week_key", weekKey).maybeSingle()));
  }
}
