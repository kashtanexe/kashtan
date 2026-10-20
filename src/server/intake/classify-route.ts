import type { PostmarkInboundPayload } from "@/lib/email/types";

export type RecipientRoute =
  | { kind: "vendor_reply"; token: string; recipient: string }
  | { kind: "alias"; localPart: string; secret: string | null; recipient: string }
  | { kind: "unknown"; recipient: string | null };

function recipients(payload: PostmarkInboundPayload): string[] {
  const list = [
    payload.OriginalRecipient,
    ...(payload.ToFull ?? []).map((a) => a.Email),
    ...(payload.CcFull ?? []).map((a) => a.Email),
    ...(payload.To ?? "").split(",").map((s) => s.match(/<([^>]+)>/)?.[1] ?? s),
  ];
  return [...new Set(list.filter((x): x is string => Boolean(x)).map((s) => s.trim().toLowerCase()))];
}

/**
 * Decide which of our addresses this message was sent to.
 *  - r+<token>@inbound      → a vendor replying to a challenge email (tokenised Reply-To)
 *  - <alias>+<secret>@inbound → exec forwarding address (secret makes it unguessable)
 *  - <alias>@inbound         → public alias; a vendor writing directly, or an exec forwarding
 */
export function classifyRecipient(payload: PostmarkInboundPayload, inboundDomain: string): RecipientRoute {
  const domain = inboundDomain.toLowerCase();
  const ours = recipients(payload).filter((r) => r.endsWith(`@${domain}`));
  for (const r of ours) {
    const local = r.slice(0, r.lastIndexOf("@"));
    const [base, hash] = local.split("+", 2) as [string, string | undefined];
    if (base === "r" && hash) return { kind: "vendor_reply", token: hash, recipient: r };
  }
  const first = ours[0];
  if (first) {
    const local = first.slice(0, first.lastIndexOf("@"));
    const [base, hash] = local.split("+", 2) as [string, string | undefined];
    return { kind: "alias", localPart: base, secret: hash ?? null, recipient: first };
  }
  return { kind: "unknown", recipient: recipients(payload)[0] ?? null };
}

/** Once the exec is known: is this the exec forwarding, or a vendor writing straight to the alias? */
export function classifyAliasMessage(fromEmail: string, execAddresses: string[]): "exec_forward" | "direct_to_alias" {
  const f = fromEmail.trim().toLowerCase();
  return execAddresses.some((a) => a.trim().toLowerCase() === f) ? "exec_forward" : "direct_to_alias";
}
