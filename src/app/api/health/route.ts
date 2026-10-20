import { NextResponse } from "next/server";
import { features, isDemoMode, models } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    demo: isDemoMode(),
    integrations: { supabase: features.supabase(), postmark: features.postmark(), stripe: features.stripe(), anthropic: features.anthropic() },
    models: models(),
  });
}
