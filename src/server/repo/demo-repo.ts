import fs from "node:fs";
import path from "node:path";
import { randomId } from "@/lib/utils";
import type { Pitch, Payment } from "@/types/domain";
import { createSeed, DEMO_SEED_VERSION, type DemoData } from "./demo-seed";
import type { PitchFilter, Repository } from "./types";

/**
 * In-memory demo store, seeded with a realistic exec and pitches.
 * Persisted to a JSON file so state survives dev-server reloads and is shared between
 * route handlers in the same machine. On Vercel the file lives in /tmp (per instance).
 */
function storePath(): string {
  if (process.env.DEMO_STORE_PATH) return process.env.DEMO_STORE_PATH;
  if (process.env.VERCEL) return "/tmp/gatekeeperai-demo.json";
  return path.join(process.cwd(), ".data", "demo-store.json");
}

interface Holder {
  data: DemoData;
  mtimeMs: number;
}

const g = globalThis as unknown as { __gkDemo?: Holder };

function load(): DemoData {
  const file = storePath();
  try {
    const stat = fs.statSync(file);
    if (g.__gkDemo && g.__gkDemo.mtimeMs >= stat.mtimeMs) return g.__gkDemo.data;
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as DemoData;
    if (parsed.version === DEMO_SEED_VERSION) {
      g.__gkDemo = { data: parsed, mtimeMs: stat.mtimeMs };
      return parsed;
    }
  } catch {
    // no file yet, unreadable, or read-only FS: fall through to memory/seed
  }
  if (g.__gkDemo) return g.__gkDemo.data;
  const seeded = createSeed();
  g.__gkDemo = { data: seeded, mtimeMs: 0 };
  persist(seeded);
  return seeded;
}

function persist(data: DemoData) {
  const file = storePath();
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    const stat = fs.statSync(file);
    g.__gkDemo = { data, mtimeMs: stat.mtimeMs };
  } catch {
    g.__gkDemo = { data, mtimeMs: Date.now() };
  }
}

function mutate<T>(fn: (d: DemoData) => T): T {
  const d = load();
  const result = fn(d);
  persist(d);
  return result;
}

const nowIso = () => new Date().toISOString();
const clone = <T>(x: T): T => (x === undefined || x === null ? x : (JSON.parse(JSON.stringify(x)) as T));

function must<T>(x: T | undefined, what: string): T {
  if (x === undefined) throw new Error(`${what} not found`);
  return x;
}

export class DemoRepository implements Repository {
  readonly kind = "demo" as const;

  async getOrganization(id: string) {
    return clone(load().organizations.find((o) => o.id === id) ?? null);
  }
  async createOrganization(input: Parameters<Repository["createOrganization"]>[0]) {
    return mutate((d) => {
      const org = { ...input, id: randomId("org"), createdAt: nowIso() };
      d.organizations.push(org);
      return clone(org);
    });
  }
  async getExec(id: string) {
    return clone(load().execs.find((e) => e.id === id) ?? null);
  }
  async getExecBySlug(slug: string) {
    return clone(load().execs.find((e) => e.slug === slug) ?? null);
  }
  async getExecByAlias(localPart: string) {
    return clone(load().execs.find((e) => e.aliasLocalPart === localPart.toLowerCase()) ?? null);
  }
  async getExecByUserId(userId: string) {
    return clone(load().execs.find((e) => e.userId === userId) ?? null);
  }
  async listExecs(orgId?: string) {
    return clone(load().execs.filter((e) => !orgId || e.orgId === orgId));
  }
  async createExec(input: Parameters<Repository["createExec"]>[0]) {
    return mutate((d) => {
      const exec = { ...input, id: randomId("exec"), createdAt: nowIso() };
      d.execs.push(exec);
      return clone(exec);
    });
  }
  async updateExec(id: string, patch: Parameters<Repository["updateExec"]>[1]) {
    return mutate((d) => {
      const e = must(d.execs.find((x) => x.id === id), "exec");
      Object.assign(e, patch, { id });
      return clone(e);
    });
  }

  async getCurrentPriorities(execId: string) {
    const list = load().priorities.filter((p) => p.execId === execId).sort((a, b) => b.version - a.version);
    return clone(list[0] ?? null);
  }
  async listPriorities(execId: string) {
    return clone(load().priorities.filter((p) => p.execId === execId).sort((a, b) => b.version - a.version));
  }
  async savePriorities(execId: string, input: Parameters<Repository["savePriorities"]>[1]) {
    return mutate((d) => {
      const version = Math.max(0, ...d.priorities.filter((p) => p.execId === execId).map((p) => p.version)) + 1;
      const p = { ...input, id: randomId("prio"), execId, version, createdAt: nowIso() };
      d.priorities.push(p);
      return clone(p);
    });
  }

  async upsertVendorContact(input: { email: string; name: string; companyName: string }) {
    return mutate((d) => {
      const email = input.email.toLowerCase();
      const domain = email.split("@")[1] ?? "unknown";
      const freeMail = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|proton|protonmail|gmx|web)\./.test(domain);
      const vendorKey = freeMail ? email : domain;
      let vendor = d.vendors.find((v) => v.domain === vendorKey);
      if (!vendor) {
        vendor = { id: randomId("ven"), domain: vendorKey, name: input.companyName || domain, createdAt: nowIso() };
        d.vendors.push(vendor);
      } else if (input.companyName && vendor.name === vendor.domain) {
        vendor.name = input.companyName;
      }
      let contact = d.contacts.find((c) => c.email === email);
      if (!contact) {
        contact = { id: randomId("con"), vendorId: vendor.id, email, name: input.name || email.split("@")[0]!, suppressed: false, createdAt: nowIso() };
        d.contacts.push(contact);
      } else if (input.name && contact.name === email.split("@")[0]) {
        contact.name = input.name;
      }
      return clone({ vendor, contact });
    });
  }
  async getVendor(id: string) {
    return clone(load().vendors.find((v) => v.id === id) ?? null);
  }
  async getContact(id: string) {
    return clone(load().contacts.find((c) => c.id === id) ?? null);
  }
  async listVendors() {
    return clone(load().vendors);
  }
  async addSuppression(email: string, reason: string) {
    mutate((d) => {
      const e = email.toLowerCase();
      if (!d.suppressions.some((s) => s.email === e)) d.suppressions.push({ email: e, reason, createdAt: nowIso() });
      d.contacts.filter((c) => c.email === e).forEach((c) => (c.suppressed = true));
    });
  }
  async isSuppressed(email: string) {
    return load().suppressions.some((s) => s.email === email.toLowerCase());
  }
  async listSuppressions() {
    return clone(load().suppressions);
  }

  async createPitch(input: Omit<Pitch, "id" | "createdAt" | "updatedAt">) {
    return mutate((d) => {
      const p: Pitch = { ...input, id: randomId("pit"), createdAt: nowIso(), updatedAt: nowIso() };
      d.pitches.push(p);
      return clone(p);
    });
  }
  async getPitch(id: string) {
    return clone(load().pitches.find((p) => p.id === id) ?? null);
  }
  async getPitchByToken(token: string) {
    return clone(load().pitches.find((p) => p.token === token) ?? null);
  }
  async updatePitch(id: string, patch: Partial<Pitch>) {
    return mutate((d) => {
      const p = must(d.pitches.find((x) => x.id === id), "pitch");
      Object.assign(p, patch, { id, updatedAt: nowIso() });
      return clone(p);
    });
  }
  async listPitches(filter: PitchFilter = {}) {
    return clone(
      load()
        .pitches.filter(
          (p) =>
            (!filter.execId || p.execId === filter.execId) &&
            (!filter.execIds || filter.execIds.includes(p.execId)) &&
            (!filter.statuses || filter.statuses.includes(p.status)) &&
            (!filter.vendorId || p.vendorId === filter.vendorId) &&
            (filter.fastTrack === undefined || p.fastTrack === filter.fastTrack),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }
  async saveAnswers(answers: Parameters<Repository["saveAnswers"]>[0]) {
    mutate((d) => {
      d.answers = d.answers.filter((a) => a.pitchId !== answers.pitchId);
      d.answers.push(answers);
    });
  }
  async getAnswers(pitchId: string) {
    return clone(load().answers.find((a) => a.pitchId === pitchId) ?? null);
  }
  async saveScore(score: Parameters<Repository["saveScore"]>[0]) {
    mutate((d) => {
      d.scores = d.scores.filter((s) => s.pitchId !== score.pitchId);
      d.scores.push(score);
    });
  }
  async getScore(pitchId: string) {
    return clone(load().scores.find((s) => s.pitchId === pitchId) ?? null);
  }
  async saveDecision(decision: Parameters<Repository["saveDecision"]>[0]) {
    return mutate((d) => {
      const dec = { ...decision, id: randomId("dec") };
      d.decisions = d.decisions.filter((x) => x.pitchId !== decision.pitchId);
      d.decisions.push(dec);
      return clone(dec);
    });
  }
  async getDecision(pitchId: string) {
    return clone(load().decisions.find((x) => x.pitchId === pitchId) ?? null);
  }
  async listDecisions(execId: string) {
    return clone(load().decisions.filter((x) => x.execId === execId));
  }

  async createPayment(input: Omit<Payment, "id" | "createdAt">) {
    return mutate((d) => {
      const p: Payment = { ...input, id: randomId("pay"), createdAt: nowIso() };
      d.payments.push(p);
      return clone(p);
    });
  }
  async updatePayment(id: string, patch: Partial<Payment>) {
    return mutate((d) => {
      const p = must(d.payments.find((x) => x.id === id), "payment");
      Object.assign(p, patch, { id });
      return clone(p);
    });
  }
  async getPaymentByPitch(pitchId: string) {
    const list = load().payments.filter((p) => p.pitchId === pitchId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return clone(list[0] ?? null);
  }
  async getPaymentBySession(sessionId: string) {
    return clone(load().payments.find((p) => p.checkoutSessionId === sessionId) ?? null);
  }
  async listPayments(filter: { status?: Payment["status"] } = {}) {
    return clone(load().payments.filter((p) => !filter.status || p.status === filter.status));
  }

  async findInboundByProviderId(providerMessageId: string) {
    return clone(load().inbound.find((i) => i.providerMessageId === providerMessageId) ?? null);
  }
  async saveInbound(input: Parameters<Repository["saveInbound"]>[0]) {
    return mutate((d) => {
      const rec = { ...input, id: randomId("inb") };
      d.inbound.push(rec);
      return clone(rec);
    });
  }
  async updateInbound(id: string, patch: Parameters<Repository["updateInbound"]>[1]) {
    return mutate((d) => {
      const rec = must(d.inbound.find((x) => x.id === id), "inbound email");
      Object.assign(rec, patch, { id });
      return clone(rec);
    });
  }
  async listInbound(execId?: string) {
    return clone(
      load()
        .inbound.filter((i) => !execId || i.execId === execId)
        .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    );
  }
  async lastChallengeAt(execId: string, email: string) {
    const d = load();
    const contactIds = new Set(d.contacts.filter((c) => c.email === email.toLowerCase()).map((c) => c.id));
    const times = d.pitches
      .filter((p) => p.execId === execId && contactIds.has(p.contactId) && p.challengedAt)
      .map((p) => p.challengedAt!)
      .sort();
    return times.at(-1) ?? null;
  }
  async logOutbox(email: Parameters<Repository["logOutbox"]>[0]) {
    return mutate((d) => {
      const rec = { ...email, id: randomId("out"), createdAt: nowIso() };
      d.outbox.push(rec);
      return clone(rec);
    });
  }
  async listOutbox(limit = 50) {
    return clone([...load().outbox].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit));
  }
  async recordEmailEvent(event: Parameters<Repository["recordEmailEvent"]>[0]) {
    mutate((d) => {
      d.emailEvents.push({ ...event, createdAt: nowIso() });
    });
  }

  async saveDigestRun(run: Parameters<Repository["saveDigestRun"]>[0]) {
    return mutate((d) => {
      const rec = { ...run, id: randomId("dig") };
      d.digestRuns.push(rec);
      return clone(rec);
    });
  }
  async getDigestRun(execId: string, weekKey: string) {
    return clone(load().digestRuns.find((r) => r.execId === execId && r.weekKey === weekKey) ?? null);
  }

  async reset() {
    persist(createSeed());
  }
}
