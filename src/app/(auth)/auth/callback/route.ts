import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/env";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/app";
  if (isDemoMode()) return NextResponse.redirect(`${origin}/app`);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Sign-in link invalid or expired")}`);
}
