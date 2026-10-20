import { getHeaders, type PostmarkHeader } from "@/lib/email/types";

export interface AuthResult {
  method: string; // dmarc | dkim | spf
  result: string; // pass | fail | none | ...
  props: Record<string, string>; // header.from, header.d, header.i, smtp.mailfrom ...
}

/**
 * Parse RFC 8601 Authentication-Results headers into method/result/props triples.
 * Example: "mx.google.com; dkim=pass header.i=@bigco.com header.s=s1; spf=pass smtp.mailfrom=bigco.com; dmarc=pass (p=REJECT) header.from=bigco.com"
 */
export function parseAuthenticationResults(values: string[]): AuthResult[] {
  const out: AuthResult[] = [];
  for (const raw of values) {
    // Drop comments in parentheses, then split on ';' — first segment is the authserv-id.
    const cleaned = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ");
    const segments = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
    for (const seg of segments) {
      const m = seg.match(/^([a-z0-9-]+)\s*=\s*([a-z0-9-]+)(.*)$/i);
      if (!m) continue;
      const [, method, result, rest] = m;
      if (!["dmarc", "dkim", "spf", "arc"].includes(method!.toLowerCase())) continue;
      const props: Record<string, string> = {};
      for (const pm of rest!.matchAll(/([a-z0-9.-]+)\s*=\s*("[^"]*"|[^\s]+)/gi)) {
        props[pm[1]!.toLowerCase()] = pm[2]!.replace(/^"|"$/g, "").toLowerCase();
      }
      out.push({ method: method!.toLowerCase(), result: result!.toLowerCase(), props });
    }
  }
  return out;
}

/** Organisational-domain alignment (relaxed): equal, or one is a subdomain of the other. */
export function domainsAlign(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/^@/, "");
  const y = b.toLowerCase().replace(/^@/, "");
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

export type ForwarderVerdict =
  | { verified: true; via: "dmarc" | "dkim"; detail: string }
  | { verified: false; reason: "not_exec_address" | "auth_failed" | "no_auth_results"; detail: string };

export interface VerifyForwarderInput {
  fromEmail: string;
  headers?: PostmarkHeader[];
  verifiedAddresses: string[];
}

/**
 * A forward is trusted only if (1) it comes from one of the exec's verified addresses and
 * (2) the From domain is authenticated: DMARC pass, or an aligned DKIM pass.
 * Otherwise anyone could make us fire challenge emails at arbitrary third parties.
 */
export function verifyForwarder(input: VerifyForwarderInput): ForwarderVerdict {
  const from = input.fromEmail.trim().toLowerCase();
  const allowed = input.verifiedAddresses.map((a) => a.trim().toLowerCase());
  if (!allowed.includes(from)) {
    return { verified: false, reason: "not_exec_address", detail: `${from} is not a verified exec address` };
  }
  const fromDomain = from.split("@")[1] ?? "";
  const results = parseAuthenticationResults(getHeaders(input.headers, "Authentication-Results"));
  if (results.length === 0) {
    return { verified: false, reason: "no_auth_results", detail: "No Authentication-Results header" };
  }

  const dmarc = results.find((r) => r.method === "dmarc");
  if (dmarc?.result === "pass" && (!dmarc.props["header.from"] || domainsAlign(dmarc.props["header.from"], fromDomain))) {
    return { verified: true, via: "dmarc", detail: `dmarc=pass header.from=${dmarc.props["header.from"] ?? fromDomain}` };
  }
  if (dmarc && dmarc.result !== "pass" && dmarc.result !== "none") {
    return { verified: false, reason: "auth_failed", detail: `dmarc=${dmarc.result}` };
  }

  const dkimAligned = results.find((r) => {
    if (r.method !== "dkim" || r.result !== "pass") return false;
    const d = r.props["header.d"] ?? (r.props["header.i"] ?? "").split("@").pop() ?? "";
    return domainsAlign(d, fromDomain);
  });
  if (dkimAligned) {
    return { verified: true, via: "dkim", detail: `dkim=pass aligned with ${fromDomain}` };
  }

  return {
    verified: false,
    reason: "auth_failed",
    detail: `No DMARC pass or aligned DKIM pass for ${fromDomain}`,
  };
}
