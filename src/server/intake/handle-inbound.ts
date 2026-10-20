import { askExecWhoEmail } from "@emails/vendor-verify";
import { digestFrom } from "@/lib/email/headers";
import { sendEmail } from "@/lib/email/provider";
import type { PostmarkInboundPayload } from "@/lib/email/types";
import { appUrl, mailDomains } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRepo } from "@/server/repo";
import { createPitch, resendChallenge, sendChallenge } from "@/server/pitches/create-pitch";
import type { ExecProfile, InboundEmail, RouteType } from "@/types/domain";
import { classifyAliasMessage, classifyRecipient } from "./classify-route";
import { extractOriginalSender, MIN_CONFIDENCE } from "./extract-original-sender";
import { triageEmail } from "./is-sales-pitch";
import { checkLoopGuard } from "./loop-guard";
import { verifyForwarder } from "./verify-forwarder";

export interface InboundResult {
  inboundId: string | null;
  routeType: RouteType;
  outcome: string;
  detail: string;
  pitchId?: string;
  duplicate?: boolean;
}

/**
 * Orchestrator: classify → (verify forwarder) → extract original sender → loop guard →
 * triage → dedupe/rate-limit → create pitch → challenge. Idempotent on Postmark MessageID.
 */
export async function handleInbound(payload: PostmarkInboundPayload): Promise<InboundResult> {
  const repo = getRepo();
  const messageId = payload.MessageID;
  if (!messageId) return { inboundId: null, routeType: "unknown", outcome: "rejected", detail: "Missing MessageID" };

  const existing = await repo.findInboundByProviderId(messageId);
  if (existing) {
    return { inboundId: existing.id, routeType: existing.routeType, outcome: existing.outcome, detail: "Already processed", duplicate: true };
  }

  const domains = mailDomains();
  const fromEmail = (payload.FromFull?.Email ?? payload.From ?? "").toLowerCase().replace(/^.*<|>.*$/g, "");
  const route = classifyRecipient(payload, domains.inbound);

  const base: Omit<InboundEmail, "id"> = {
    providerMessageId: messageId,
    execId: null,
    routeType: "unknown",
    fromEmail,
    toEmail: route.recipient ?? "",
    subject: payload.Subject ?? "",
    originalSenderEmail: null,
    extractionMethod: null,
    authVerdict: "",
    outcome: "pending",
    note: "",
    receivedAt: new Date().toISOString(),
  };

  const finish = async (rec: Omit<InboundEmail, "id">, extra: Partial<InboundResult> = {}): Promise<InboundResult> => {
    const saved = await repo.saveInbound(rec);
    logger.info("inbound processed", { id: saved.id, route: rec.routeType, outcome: rec.outcome });
    return { inboundId: saved.id, routeType: rec.routeType, outcome: rec.outcome, detail: rec.note, ...extra };
  };

  // --- Vendor replied to a challenge (r+<token>@inbound) --------------------
  if (route.kind === "vendor_reply") {
    const pitch = await repo.getPitchByToken(route.token);
    const rec = { ...base, routeType: "vendor_reply" as const };
    if (!pitch) return finish({ ...rec, outcome: "dropped:unknown_token", note: "No pitch for this reply token" });
    const guard = checkLoopGuard({ senderEmail: fromEmail, subject: payload.Subject, headers: payload.Headers, ownDomains: [domains.inbound, domains.from] });
    if (!guard.allowed) return finish({ ...rec, execId: pitch.execId, outcome: `dropped:${guard.reason}`, note: guard.detail });
    const exec = (await repo.getExec(pitch.execId))!;
    if (pitch.status === "challenged") {
      await resendChallenge(pitch, exec);
      return finish({ ...rec, execId: exec.id, outcome: "brief_link_resent", note: "Vendor replied instead of clicking; link re-sent" }, { pitchId: pitch.id });
    }
    return finish({ ...rec, execId: exec.id, outcome: "logged", note: `Reply on pitch in status ${pitch.status}` }, { pitchId: pitch.id });
  }

  if (route.kind === "unknown") {
    return finish({ ...base, outcome: "dropped:unknown_recipient", note: "Not addressed to a known alias" });
  }

  const exec = await repo.getExecByAlias(route.localPart);
  if (!exec) return finish({ ...base, outcome: "dropped:unknown_alias", note: `No exec for alias ${route.localPart}` });
  const routeType = classifyAliasMessage(fromEmail, exec.verifiedAddresses);
  const rec = { ...base, execId: exec.id, routeType };

  let senderEmail: string;
  let senderName: string;
  let subject: string;
  let body: string;
  let guardHeaders = payload.Headers;

  if (routeType === "exec_forward") {
    // 1) The forward must really come from the exec (DMARC / aligned DKIM)
    const verdict = verifyForwarder({ fromEmail, headers: payload.Headers, verifiedAddresses: exec.verifiedAddresses });
    if (!verdict.verified) {
      return finish({ ...rec, authVerdict: `${verdict.reason}: ${verdict.detail}`, outcome: "dropped:spoofed_forward", note: "Forward failed sender authentication; nobody was contacted" });
    }
    if (route.secret && route.secret !== exec.aliasSecret) {
      return finish({ ...rec, authVerdict: verdict.detail, outcome: "dropped:bad_alias_secret", note: "Forwarding address secret mismatch" });
    }
    // 2) Who wrote the original?
    const extracted = extractOriginalSender(payload, {
      excludeAddresses: [...exec.verifiedAddresses, exec.email],
      excludeDomains: [domains.inbound, domains.from],
    });
    const withAuth = { ...rec, authVerdict: verdict.detail, originalSenderEmail: extracted.email, extractionMethod: `${extracted.method}${extracted.locale ? `:${extracted.locale}` : ""}` };
    if (!extracted.email || extracted.confidence < MIN_CONFIDENCE) {
      const em = askExecWhoEmail({ execFirstName: exec.fullName.split(" ")[0]!, subject: payload.Subject ?? "(no subject)", appUrl: `${appUrl()}/app/filtered` });
      await sendEmail({ kind: "ask_exec_sender", to: exec.email, from: digestFrom(), subject: em.subject, html: em.html, text: em.text, execId: exec.id, stream: "digests" });
      return finish({ ...withAuth, outcome: "needs_exec:sender_unknown", note: `Low confidence (${extracted.confidence.toFixed(2)}); asked the exec` });
    }
    senderEmail = extracted.email;
    senderName = extracted.name;
    subject = extracted.subject || payload.Subject || "";
    body = extracted.body;
    if (extracted.headers) guardHeaders = extracted.headers;
    else guardHeaders = []; // header-block forwards: the forward's own headers belong to the exec
    Object.assign(rec, withAuth);
  } else {
    senderEmail = fromEmail;
    senderName = payload.FromFull?.Name || payload.FromName || "";
    subject = payload.Subject ?? "";
    body = payload.TextBody ?? "";
    rec.originalSenderEmail = fromEmail;
    rec.extractionMethod = "direct";
    rec.authVerdict = "n/a (direct to alias)";
  }

  // 3) Loop guard: robots, lists, noreply, suppression, 1 challenge / sender / exec / 30 days
  const guard = checkLoopGuard({
    senderEmail,
    subject,
    headers: guardHeaders,
    lastChallengeAt: await repo.lastChallengeAt(exec.id, senderEmail),
    suppressed: await repo.isSuppressed(senderEmail),
    ownDomains: [domains.inbound, domains.from, exec.email.split("@")[1] ?? ""].filter(Boolean),
  });
  if (!guard.allowed) return finish({ ...rec, outcome: `dropped:${guard.reason}`, note: guard.detail });

  // 4) Is it even a sales pitch? (Haiku triage, heuristic fallback)
  const triage = await triageEmail(subject, body, senderName);
  if (!triage.isSalesPitch) return finish({ ...rec, outcome: `dropped:not_a_pitch:${triage.category}`, note: `Triage (${triage.via}) says ${triage.category}` });

  // 5) Pitch + challenge
  const inbound = await repo.saveInbound({ ...rec, outcome: "processing" });
  const pitch = await createPitch({
    exec: exec as ExecProfile,
    senderEmail,
    senderName,
    companyName: triage.companyName && triage.via === "claude" ? triage.companyName : undefined,
    source: routeType === "exec_forward" ? "forward" : "alias",
    subject,
    snippet: body.replace(/\s+/g, " ").trim().slice(0, 600),
    inboundEmailId: inbound.id,
  });
  await sendChallenge(pitch, exec);
  await repo.updateInbound(inbound.id, { outcome: "challenge_sent", note: `Challenge sent to ${senderEmail}` });
  return { inboundId: inbound.id, routeType, outcome: "challenge_sent", detail: `Challenge sent to ${senderEmail}`, pitchId: pitch.id };
}
