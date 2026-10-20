import { getRepo } from "@/server/repo";

const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|proton|protonmail|gmx|web)\./;

/** Vendors are normalised by company domain; free-mail senders are keyed by address. */
export function vendorKeyFor(email: string): string {
  const e = email.trim().toLowerCase();
  const domain = e.split("@")[1] ?? "";
  return FREE_MAIL.test(domain) ? e : domain;
}

/** Best-effort company name from a domain: "tessellaterisk.eu" → "Tessellaterisk". */
export function guessCompanyName(email: string): string {
  const domain = email.split("@")[1] ?? "";
  if (FREE_MAIL.test(domain)) return "";
  const base = domain.split(".").slice(0, -1).join(" ").replace(/[-_]/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function upsertVendor(input: { email: string; name?: string; companyName?: string }) {
  return getRepo().upsertVendorContact({
    email: input.email,
    name: input.name ?? "",
    companyName: input.companyName || guessCompanyName(input.email),
  });
}
