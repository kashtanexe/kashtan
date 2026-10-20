import { features } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getRepo } from "@/server/repo";
import type { OutboxEmail } from "@/types/domain";
import { sendViaPostmark } from "./postmark";
import type { OutgoingEmail } from "./types";

export interface EmailProvider {
  readonly name: "postmark" | "demo";
  send(email: OutgoingEmail): Promise<{ providerMessageId: string | null }>;
}

const demoProvider: EmailProvider = {
  name: "demo",
  async send() {
    return { providerMessageId: null };
  },
};

const postmarkProvider: EmailProvider = {
  name: "postmark",
  send: sendViaPostmark,
};

export function getEmailProvider(): EmailProvider {
  return features.postmark() ? postmarkProvider : demoProvider;
}

/**
 * Send (or, in demo mode, just record) an email. Every email is logged to the outbox so
 * the demo can show exactly what would have gone out.
 */
export async function sendEmail(email: OutgoingEmail): Promise<OutboxEmail> {
  const provider = getEmailProvider();
  let providerMessageId: string | null = null;
  const repo = getRepo();
  if (await repo.isSuppressed(email.to)) {
    logger.warn("email suppressed", { to: email.to, kind: email.kind });
  } else {
    try {
      ({ providerMessageId } = await provider.send(email));
    } catch (err) {
      logger.error("email send failed", { err: String(err), kind: email.kind });
    }
  }
  return repo.logOutbox({
    kind: email.kind,
    pitchId: email.pitchId ?? null,
    execId: email.execId ?? null,
    from: email.from,
    to: email.to,
    replyTo: email.replyTo ?? null,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: email.headers ?? {},
    stream: email.stream ?? "outbound",
    provider: provider.name,
    providerMessageId,
  });
}
