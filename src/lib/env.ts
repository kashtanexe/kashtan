import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optional,
  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  POSTMARK_SERVER_TOKEN: optional,
  POSTMARK_INBOUND_USER: optional,
  POSTMARK_INBOUND_PASSWORD: optional,
  POSTMARK_CHALLENGE_STREAM: optional,
  POSTMARK_DIGEST_STREAM: optional,
  MAIL_FROM_DOMAIN: optional,
  INBOUND_DOMAIN: optional,
  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: optional,
  ANTHROPIC_TRIAGE_MODEL: optional,
  TOKEN_SECRET: optional,
  CRON_SECRET: optional,
  DEMO_MODE: optional,
});

export type Env = z.infer<typeof EnvSchema>;

export function getEnv(): Env {
  return EnvSchema.parse(process.env);
}

export function appUrl(): string {
  const env = getEnv();
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const features = {
  /** Supabase is used only when all three keys exist and DEMO_MODE is not forced on. */
  supabase(): boolean {
    const e = getEnv();
    if (e.DEMO_MODE === "true" || e.DEMO_MODE === "1") return false;
    return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY);
  },
  postmark(): boolean {
    return Boolean(getEnv().POSTMARK_SERVER_TOKEN) && !isDemoForced();
  },
  stripe(): boolean {
    return Boolean(getEnv().STRIPE_SECRET_KEY) && !isDemoForced();
  },
  anthropic(): boolean {
    return Boolean(getEnv().ANTHROPIC_API_KEY);
  },
};

function isDemoForced(): boolean {
  const v = getEnv().DEMO_MODE;
  return v === "true" || v === "1";
}

/** Demo mode = no database configured. The whole app runs on the seeded in-memory store. */
export function isDemoMode(): boolean {
  return !features.supabase();
}

export function models() {
  const e = getEnv();
  return {
    scoring: e.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    triage: e.ANTHROPIC_TRIAGE_MODEL ?? "claude-haiku-5-5",
  };
}

export function mailDomains() {
  const e = getEnv();
  return {
    from: e.MAIL_FROM_DOMAIN ?? "mail.filtr.ai",
    inbound: e.INBOUND_DOMAIN ?? "in.filtr.ai",
  };
}
