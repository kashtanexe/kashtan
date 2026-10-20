import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

let client: Anthropic | null = null;

/** Shared SDK client. Model IDs come from env (see models() in lib/env). */
export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY, maxRetries: 2, timeout: 60_000 });
  }
  return client;
}
