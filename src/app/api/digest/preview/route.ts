import { NextResponse, type NextRequest } from "next/server";
import { isDemoMode } from "@/lib/env";
import { getCurrentExec } from "@/server/auth";
import { renderDigestForExec } from "@/server/digest/build-digest";

export const dynamic = "force-dynamic";

/** Raw HTML of the current exec's weekly digest (what the email client renders). */
export async function GET(req: NextRequest) {
  const exec = await getCurrentExec();
  const { email, data } = await renderDigestForExec(exec);
  if (req.nextUrl.searchParams.get("format") === "json") return NextResponse.json({ subject: email.subject, data, demo: isDemoMode() });
  return new NextResponse(email.html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
