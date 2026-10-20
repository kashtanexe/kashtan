import { getRepo } from "@/server/repo";
import type { ExecProfile, PitchStatus, Vendor } from "@/types/domain";

export interface VendorHistoryRow {
  vendor: Vendor;
  totalPitches: number;
  execs: { id: string; name: string; title: string; status: PitchStatus; at: string }[];
  colleagueCount: number; // excluding the current exec
  pitchedMe: boolean;
  lastPitchedAt: string;
  anyAccepted: boolean;
}

/** Shared vendor memory (Pro): "who else here got pitched by them?" */
export async function buildVendorDatabase(orgId: string, currentExecId: string): Promise<{ rows: VendorHistoryRow[]; execs: ExecProfile[] }> {
  const repo = getRepo();
  const execs = await repo.listExecs(orgId);
  const pitches = await repo.listPitches({ execIds: execs.map((e) => e.id) });
  const vendors = await repo.listVendors();
  const byVendor = new Map<string, VendorHistoryRow>();
  for (const p of pitches) {
    const vendor = vendors.find((v) => v.id === p.vendorId);
    const exec = execs.find((e) => e.id === p.execId);
    if (!vendor || !exec) continue;
    let row = byVendor.get(vendor.id);
    if (!row) {
      row = { vendor, totalPitches: 0, execs: [], colleagueCount: 0, pitchedMe: false, lastPitchedAt: p.createdAt, anyAccepted: false };
      byVendor.set(vendor.id, row);
    }
    row.totalPitches++;
    if (!row.execs.some((e) => e.id === exec.id)) row.execs.push({ id: exec.id, name: exec.fullName, title: exec.title, status: p.status, at: p.createdAt });
    if (p.execId === currentExecId) row.pitchedMe = true;
    if (p.status === "accepted") row.anyAccepted = true;
    if (p.createdAt > row.lastPitchedAt) row.lastPitchedAt = p.createdAt;
  }
  const rows = [...byVendor.values()].map((r) => ({ ...r, colleagueCount: r.execs.filter((e) => e.id !== currentExecId).length }));
  rows.sort((a, b) => b.execs.length - a.execs.length || b.lastPitchedAt.localeCompare(a.lastPitchedAt));
  return { rows, execs };
}

/** For a single card: how many colleagues has this vendor also pitched? */
export async function colleaguesPitchedBy(vendorId: string, exec: ExecProfile): Promise<{ name: string; status: PitchStatus }[]> {
  const repo = getRepo();
  const org = await repo.getOrganization(exec.orgId);
  if (!org || org.plan === "free") return [];
  const execs = await repo.listExecs(exec.orgId);
  const pitches = await repo.listPitches({ vendorId, execIds: execs.map((e) => e.id).filter((id) => id !== exec.id) });
  const seen = new Map<string, { name: string; status: PitchStatus }>();
  for (const p of pitches) {
    const e = execs.find((x) => x.id === p.execId);
    if (e && !seen.has(e.id)) seen.set(e.id, { name: e.fullName, status: p.status });
  }
  return [...seen.values()];
}
