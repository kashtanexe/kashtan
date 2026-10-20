import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PostmarkInboundPayload } from "@/lib/email/types";
import { classifyAliasMessage, classifyRecipient } from "@/server/intake/classify-route";
import { parseAuthenticationResults, verifyForwarder } from "@/server/intake/verify-forwarder";

const load = (name: string) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, "../fixtures/inbound", name), "utf8")) as PostmarkInboundPayload;
const addrs = ["claire.dubois@northwindpay.eu"];

describe("verify forwarder (DMARC / DKIM alignment)", () => {
  it("accepts a DMARC-pass forward from a verified exec address", () => {
    const p = load("gmail-web-forward.json");
    expect(verifyForwarder({ fromEmail: p.From, headers: p.Headers, verifiedAddresses: addrs })).toMatchObject({ verified: true, via: "dmarc" });
  });

  it("rejects a spoofed exec (dmarc=fail)", () => {
    const p = load("spoofed-exec.json");
    expect(verifyForwarder({ fromEmail: p.From, headers: p.Headers, verifiedAddresses: addrs })).toMatchObject({ verified: false, reason: "auth_failed" });
  });

  it("rejects unknown senders and missing auth results", () => {
    expect(verifyForwarder({ fromEmail: "x@y.com", headers: [], verifiedAddresses: addrs })).toMatchObject({ reason: "not_exec_address" });
    expect(verifyForwarder({ fromEmail: addrs[0]!, headers: [], verifiedAddresses: addrs })).toMatchObject({ reason: "no_auth_results" });
  });

  it("accepts an aligned DKIM pass when there is no DMARC result", () => {
    const headers = [{ Name: "Authentication-Results", Value: "mx; dkim=pass header.i=@mail.northwindpay.eu; spf=softfail" }];
    expect(verifyForwarder({ fromEmail: addrs[0]!, headers, verifiedAddresses: addrs })).toMatchObject({ verified: true, via: "dkim" });
  });

  it("rejects an unaligned DKIM pass (signed by a third party)", () => {
    const headers = [{ Name: "Authentication-Results", Value: "mx; dkim=pass header.d=sendgrid.net" }];
    expect(verifyForwarder({ fromEmail: addrs[0]!, headers, verifiedAddresses: addrs }).verified).toBe(false);
  });

  it("parses comments and multiple methods", () => {
    const r = parseAuthenticationResults(["mx.google.com; dkim=pass (2048-bit key) header.d=a.com; dmarc=pass (p=NONE) header.from=a.com"]);
    expect(r.map((x) => x.method)).toEqual(["dkim", "dmarc"]);
    expect(r[1]!.props["header.from"]).toBe("a.com");
  });
});

describe("classify route", () => {
  it("detects the exec forwarding address with its secret", () => {
    expect(classifyRecipient(load("gmail-web-forward.json"), "in.gatekeeperai.app")).toMatchObject({ kind: "alias", localPart: "claire.dubois", secret: "k7f3q9" });
  });
  it("detects vendor replies via the tokenised Reply-To", () => {
    expect(classifyRecipient(load("ooo-autoreply.json"), "in.gatekeeperai.app")).toMatchObject({ kind: "vendor_reply", token: "tok_gridline" });
  });
  it("tells exec forwards from direct vendor mail", () => {
    expect(classifyAliasMessage("Claire.Dubois@northwindpay.eu", addrs)).toBe("exec_forward");
    expect(classifyAliasMessage("laura.chen@atlasendpoint.com", addrs)).toBe("direct_to_alias");
  });
});
