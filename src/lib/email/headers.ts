import { mailDomains } from "@/lib/env";

/** We never send "as" the exec: challenges come from our authenticated subdomain. */
export function deskFrom(execName: string): string {
  const safe = execName.replace(/["<>\r\n]/g, "").slice(0, 60);
  return `"${safe}'s Vendor Desk" <desk@${mailDomains().from}>`;
}

export function digestFrom(): string {
  return `"FILTR" <digest@${mailDomains().from}>`;
}

/** A vendor who just hits "reply" lands back in the same pitch. */
export function replyToForPitch(token: string): string {
  return `r+${token}@${mailDomains().inbound}`;
}

export function publicAlias(localPart: string): string {
  return `${localPart}@${mailDomains().inbound}`;
}

export function forwardingAddress(localPart: string, secret: string): string {
  return `${localPart}+${secret}@${mailDomains().inbound}`;
}

/** RFC 3834: mark automatic replies so other robots don't answer them (loop prevention). */
export const AUTO_REPLY_HEADERS: Record<string, string> = {
  "Auto-Submitted": "auto-replied",
  "X-Auto-Response-Suppress": "All",
};
