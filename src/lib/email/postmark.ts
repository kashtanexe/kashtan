import { ServerClient } from "postmark";
import { getEnv } from "@/lib/env";
import type { OutgoingEmail } from "./types";

let client: ServerClient | null = null;

function getClient(): ServerClient {
  if (!client) client = new ServerClient(getEnv().POSTMARK_SERVER_TOKEN!);
  return client;
}

export async function sendViaPostmark(email: OutgoingEmail): Promise<{ providerMessageId: string | null }> {
  const env = getEnv();
  const stream =
    email.stream === "challenges"
      ? (env.POSTMARK_CHALLENGE_STREAM ?? "outbound")
      : email.stream === "digests"
        ? (env.POSTMARK_DIGEST_STREAM ?? "outbound")
        : "outbound";
  const res = await getClient().sendEmail({
    From: email.from,
    To: email.to,
    ReplyTo: email.replyTo,
    Subject: email.subject,
    HtmlBody: email.html,
    TextBody: email.text,
    MessageStream: stream,
    TrackOpens: false,
    Headers: Object.entries(email.headers ?? {}).map(([Name, Value]) => ({ Name, Value })),
    Metadata: email.pitchId ? { pitchId: email.pitchId, kind: email.kind } : { kind: email.kind },
  });
  return { providerMessageId: res.MessageID ?? null };
}
