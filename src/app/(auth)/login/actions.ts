"use server";

import { redirect } from "next/navigation";
import { appUrl, isDemoMode } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function requestMagicLink(formData: FormData) {
  if (isDemoMode()) redirect("/app");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/login?error=email");
  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl()}/auth/callback?next=/app` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?sent=${encodeURIComponent(email)}`);
}

export async function signOut() {
  if (!isDemoMode()) {
    const supabase = await getSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/");
}
