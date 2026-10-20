import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/route-auth";
import { enforceSla } from "@/server/payments/sla";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Refunds every Fast-Track whose 7-day review promise was missed. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await enforceSla());
}
