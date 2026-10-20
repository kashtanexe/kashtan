import { features } from "@/lib/env";
import { DemoRepository } from "./demo-repo";
import { SupabaseRepository } from "./supabase-repo";
import type { Repository } from "./types";

const g = globalThis as unknown as { __gkRepo?: Repository };

/** Supabase when keys exist, otherwise the seeded demo store. */
export function getRepo(): Repository {
  const want = features.supabase() ? "supabase" : "demo";
  if (!g.__gkRepo || g.__gkRepo.kind !== want) {
    g.__gkRepo = want === "supabase" ? new SupabaseRepository() : new DemoRepository();
  }
  return g.__gkRepo;
}

export type { Repository } from "./types";
