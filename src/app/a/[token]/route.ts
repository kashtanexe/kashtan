import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { verifyToken } from "@/lib/tokens";
import { acceptPitch, passPitch } from "@/server/pitches/decide";
import { getRepo } from "@/server/repo";
import { PASS_REASONS, type PassReason } from "@/types/domain";

/**
 * Signed 1-click actions from emails (no login): /a/<token>.
 * GET shows a confirmation page (so link scanners/prefetchers can't trigger decisions);
 * POST performs the action.
 */
function page(title: string, body: string, form?: string) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6fb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px">
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px;max-width:420px;width:100%;text-align:center">
<h1 style="font-size:20px;margin:0 0 8px">${title}</h1><p style="color:#475569;font-size:14px;line-height:1.5">${body}</p>${form ?? ""}
<p style="margin-top:18px"><a href="${appUrl()}/app" style="color:#254beb;font-size:14px">Open your inbox</a></p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function resolve(token: string) {
  const payload = verifyToken(token);
  if (!payload || (payload.p !== "accept" && payload.p !== "pass")) return null;
  const pitch = await getRepo().getPitch(payload.s);
  if (!pitch) return null;
  const answers = await getRepo().getAnswers(pitch.id);
  return { payload, pitch, company: answers?.companyName ?? "this vendor" };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await resolve(token);
  if (!r) return page("Link expired", "This action link is invalid or has expired.");
  if (r.pitch.status !== "surfaced" && r.pitch.status !== "filtered") return page("Already decided", `You've already decided on ${r.company}.`);
  const label = r.payload.p === "accept" ? `Accept ${r.company} and send your calendar link?` : `Pass on ${r.company}: “${PASS_REASONS.find((x) => x.value === r.payload.x)?.label ?? "Not a fit"}”?`;
  const color = r.payload.p === "accept" ? "#047857" : "#334155";
  return page(
    "Confirm",
    label,
    `<form method="post"><button style="background:${color};color:#fff;border:0;border-radius:9px;padding:11px 20px;font-weight:600;font-size:14px;cursor:pointer">Confirm</button></form>`,
  );
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await resolve(token);
  if (!r) return page("Link expired", "This action link is invalid or has expired.");
  if (r.pitch.status !== "surfaced" && r.pitch.status !== "filtered") return page("Already decided", `You've already decided on ${r.company}.`);
  if (r.payload.p === "accept") {
    await acceptPitch(r.pitch.execId, r.pitch.id, "via email");
    return page("Accepted", `${r.company} has your calendar link.`);
  }
  const reason = (PASS_REASONS.find((x) => x.value === r.payload.x)?.value ?? "not_priority") as PassReason;
  await passPitch(r.pitch.execId, r.pitch.id, reason, "via email");
  return page("Passed", `${r.company} has been told, politely.`);
}
