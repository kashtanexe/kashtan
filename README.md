# GatekeeperAI

**The vendor desk for busy executives.** Cold pitches answer four hard questions before they reach you. AI scores them against your private quarterly priorities, and you only see the two or three worth a meeting, as one-glance **Baseball Cards**.

```
cold email ─► exec's alias / one-click forward / "Pitch Me" link
          ─► we reply to the ORIGINAL sender with a 60-second brief (never "as" the exec)
          ─► vendor answers 4 questions (free, or ~€30 Fast-Track with a 7-day review-or-refund promise)
          ─► hard gates (budget, compliance, dealbreakers) + Claude scoring vs. the exec's profile
          ─► top matches become Baseball Cards ─► Accept (calendar link) / Pass (1-click reason)
          ─► Friday 08:00 digest (exec's timezone)
```

Zero IT permissions: no OAuth, no mailbox access. We only see what the exec forwards or what vendors send to the alias or link.

---

## Demo mode (zero keys)

With **no environment variables at all**, the app runs fully in demo mode:

| Piece | Demo behaviour |
|---|---|
| Database | Seeded in-memory store persisted to `.data/demo-store.json` (`/tmp` on Vercel) |
| Auth | Magic link bypassed; you are **Claire Dubois, CISO at Northwind Pay** (a fictional ~2,100-person EU payments fintech) with Q4 2026 priorities (DORA, SIEM cost, passkeys, GenAI governance, TLPT) |
| Email | Nothing is sent; every email (with headers) is captured in **App → Outbox** |
| Payments | Simulated Checkout page; "skip 7 days" button triggers the automatic SLA refund |
| Scoring | Deterministic heuristic scorer (same hard gates, same injection guard) |

A yellow **Demo mode** badge is shown in the header/sidebar. Each integration switches on independently as soon as its keys exist (e.g. add only `ANTHROPIC_API_KEY` to get real Claude scoring while everything else stays in demo).

### Demo script (5 minutes)

1. **Landing page** `/`: the pitch.
2. **Vendor side** `/in/claire-dubois`: the public Pitch Me page. Start a pitch → you land on the 4-question brief → choose Free or Fast-Track → submitted/status page.
3. **Exec inbox** `/app`: Baseball Cards with score, 2-bullet TL;DR, pros/cons, recommended action, self-attested compliance badges, Fast-Track SLA countdowns and "pitched to N colleagues".
4. **Simulate inbound email** `/app/simulate`: fire a forwarded cold email (Gmail, Outlook FR, iPhone, .eml attachment) and watch it become a challenge (see **Outbox**). Try the OOO auto-reply and the spoofed forward: nobody gets contacted.
5. **Pitch detail**: Accept → the vendor gets the booking link (Outbox). On a Fast-Track card, press *Demo: skip 7 days* to see the automatic refund.
6. **Filtered** `/app/filtered`: audit trail with hard-gate reasons, including a neutralised prompt-injection attempt.
7. **Friday digest** `/app/digest`: the exact email, plus "Send it to me now".
8. **Team (Pro)** `/app/team/vendors`: shared vendor database across 4 execs.
9. **Settings**: threshold (with a suggested value), auto-unlock (off by default), calendar link, Fast-Track price and charity toggle, versioned priorities.

Use **Reset demo data** (sidebar, bottom) to restore the seed before a presentation.

Seeded pitches: `pit_tessellate`, `pit_keyward` (surfaced), `pit_veilgate`, `pit_driftwood` (Fast-Track with live SLA), `pit_northlight` (accepted), `pit_stackpeak` (passed), `pit_chainshield`, `pit_brightleads`, `pit_omnivault`, `pit_quicksec` (filtered: dealbreaker / budget / injection), `pit_gridline`, `pit_atlas` (challenged, awaiting the brief), `pit_corvid` (refunded).

---

## Clickable sales demo (`/demo`)

`public/demo/index.html` is a standalone, bilingual (EN/FR) clickable demo for client meetings: forward simulator, vendor brief, Baseball Cards, Friday digest and profile setup, with cybersecurity vendor examples. It runs with no server or keys (open `/demo/` on any deployment, or the file directly). Vendor names are illustrative; pitch text, scores and references are invented.

## Run locally

Requirements: Node.js 20.11+ (22 recommended).

```bash
npm install
npm run dev          # http://localhost:3000  (demo mode, no keys needed)
```

Other scripts:

```bash
npm test             # unit tests (vitest): hard gates, sender extraction fixtures, loop guard, state machine, scoring, digest timing, end-to-end demo flow
npm run eval         # scoring eval set (golden + adversarial); uses Claude if ANTHROPIC_API_KEY is set
npm run build        # production build
npm run typecheck
npm run seed:generate     # regenerate supabase/seed.sql from the demo seed (Node 22.6+)
npm run fixtures:generate # regenerate tests/fixtures/inbound/*.json
```

---

## Deploy to Vercel (a few clicks)

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project → Import** the repository. Framework preset: Next.js (auto-detected). No build settings to change.
3. Click **Deploy**. With no env vars it deploys in **demo mode** and works immediately.
4. Optional: add env vars (Project → Settings → Environment Variables) and redeploy to switch integrations on.

`vercel.json` registers three cron jobs. They are set to **daily** so they work on the Hobby plan; on Pro, change `weekly-digest` to hourly (`0 * * * *`) for exact 08:00-local delivery in every timezone (the daily run still catches up on Friday mornings in Europe).

> Demo mode on Vercel: the demo store lives in each serverless instance's `/tmp`, so changes you make (simulated emails, decisions) can occasionally "disappear" when Vercel routes a request to a different instance. For a live client demo, `npm run dev` locally is the most reliable; for a shared persistent demo, connect Supabase.

---

## Environment variables

All optional. See `.env.example`.

| Variable | Used for | Without it |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails | `VERCEL_URL` or `http://localhost:3000` |
| `TOKEN_SECRET` | Signing pitch links and 1-click email actions | Demo secret (required outside demo mode) |
| `DEMO_MODE` | Force demo mode even with keys (`true`) | |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Postgres storage + magic-link auth | Demo store, no login |
| `POSTMARK_SERVER_TOKEN` | Sending email | Emails captured in Outbox |
| `POSTMARK_INBOUND_USER`, `POSTMARK_INBOUND_PASSWORD` | Basic auth on inbound/events webhooks | Webhooks open (demo only) |
| `POSTMARK_CHALLENGE_STREAM`, `POSTMARK_DIGEST_STREAM` | Separate message streams | `outbound` |
| `MAIL_FROM_DOMAIN` | Authenticated sending subdomain (`desk@…`) | `mail.gatekeeperai.app` |
| `INBOUND_DOMAIN` | Alias / Reply-To domain (MX → Postmark) | `in.gatekeeperai.app` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Fast-Track Checkout, webhook, refunds | Simulated checkout |
| `ANTHROPIC_API_KEY` | Claude scoring + triage | Heuristic scorer |
| `ANTHROPIC_MODEL` | Scoring model | `claude-sonnet-5-5` |
| `ANTHROPIC_TRIAGE_MODEL` | "Is this a sales pitch?" triage | `claude-haiku-5-5` |
| `CRON_SECRET` | Protects `/api/cron/*` (Vercel sends it automatically) | Cron routes open in demo mode only |

`GET /api/health` shows which integrations are active.

---

## Connecting the real services

### Supabase
1. Create a project (choose an **EU region**).
2. Apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`, or paste `supabase/migrations/*.sql` in order into the SQL editor.
3. Optional demo data: run `supabase/seed.sql` (edit the seeded emails to your own first; signing in with a seeded exec's email claims that profile).
4. Auth → URL configuration: Site URL = your app URL; add `https://<your-app>/auth/callback` to redirect URLs. Email (magic link) provider is on by default.
5. Set the three Supabase env vars. Server code uses the service-role key (never shipped to the browser) and enforces ownership; RLS policies (`0007_rls_policies.sql`) protect any direct anon/authenticated access.

### Postmark
1. Create a server with message streams `challenges` and `digests` (transactional). Tell Postmark up front that challenges are triggered by inbound mail.
2. Verify your sending subdomain (`MAIL_FROM_DOMAIN`) with DKIM + Return-Path; publish SPF and a DMARC policy (`p=quarantine`). Keep it separate from your marketing domain.
3. Inbound: point an MX record for `INBOUND_DOMAIN` to `inbound.postmarkapp.com`, and set the inbound webhook to `https://USER:PASS@<app>/api/webhooks/inbound-email`. We use Postmark's parsed JSON (headers, bodies and attachments, incl. `message/rfc822`), so no raw-email option is needed.
4. Bounce/spam webhooks → `https://USER:PASS@<app>/api/webhooks/email-events` (feeds the suppression list).

### Stripe
1. Set `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint `https://<app>/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`; copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
Refunds on SLA miss are issued by `/api/cron/sla-enforcer` with an idempotency key.

### Anthropic
Set `ANTHROPIC_API_KEY`. Scoring uses `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) with Structured Outputs (`client.messages.parse` + a zod schema); triage uses `ANTHROPIC_TRIAGE_MODEL` (default `claude-haiku-5-5`). Any API failure falls back to the heuristic scorer, so a pitch is never lost.

---

## Architecture

```
src/
  app/                    Next.js App Router (thin route handlers, server actions)
    (marketing)/          landing, pricing, for-vendors, legal
    (auth)/               magic-link login + callback
    (app)/app/            exec area: inbox, pitches/[id], filtered, activity, digest, outbox,
                          simulate (demo), onboarding/*, settings/*, team/*
    in/[slug]/            public Pitch Me page
    pitch/[pitchId]/      vendor brief, fast-track, checkout (demo), submitted, status
    a/[token]/            signed 1-click Accept/Pass from email (GET confirms, POST acts)
    api/webhooks/         inbound-email (Postmark), email-events, stripe
    api/cron/             weekly-digest, sla-enforcer, challenge-reminders
  server/                 framework-agnostic domain logic (unit-tested)
    intake/               handle-inbound, classify-route, verify-forwarder, extract-original-sender,
                          loop-guard, is-sales-pitch, samples (demo)
    pitches/              state-machine, create-pitch, submit-brief, decide, views, links
    scoring/              hard-gates, score-pitch, prompts, schema, threshold
    payments/             create-checkout, handle-stripe-event, sla
    digest/               build-digest, select-due-execs
    vendors/              upsert-vendor, team-history
    repo/                 Repository interface + DemoRepository + SupabaseRepository
  lib/                    env, email (provider/postmark/headers), ai, stripe, tokens, calendar, supabase
emails/                   plain-HTML email templates (Outlook/Gmail safe)
supabase/                 migrations 0001–0008 (+RLS), seed.sql, config.toml
tests/                    unit tests, inbound fixtures per mail client, scoring eval set
```

**Pitch states:** `received → challenged → brief_submitted → (awaiting_payment) → scoring → surfaced | filtered → accepted | passed`, `surfaced → expired → refunded` (Fast-Track SLA miss). Single source of truth: `src/server/pitches/state-machine.ts`.

**Safety rails built in**
- Forwards accepted only from verified exec addresses that pass DMARC or aligned DKIM (`verify-forwarder.ts`), plus a per-exec secret in the forwarding address.
- Original sender extraction: `message/rfc822` attachment → localised forwarded-header blocks (EN/FR/DE/NL/ES; Gmail, Outlook, Apple Mail) → low-confidence fallback, below which we ask the exec instead of emailing anyone.
- Loop guard: `Auto-Submitted`, `Precedence: bulk`, `List-*`, no-reply senders, multilingual OOO subjects, suppression list, max one challenge per sender per exec per 30 days. Our own mail carries `Auto-Submitted: auto-replied` and a tokenised `Reply-To`.
- Scoring: deterministic hard gates first; vendor text is sanitised and delimited as untrusted data; injection attempts are detected in code and by the model, and capped.
- Fast-Track money goes to the platform (never the exec), with automatic refunds on SLA miss and an optional charity toggle.

## Shortcuts in this MVP
- Scoring runs inline in the request (fast enough for the heuristic and a single Claude call); `lib/jobs.ts` wraps `after()` and is the seam for Inngest / pgmq.
- Team routing rules and Pro seat billing are UI stubs; the shared vendor database is real.
- No Playwright e2e suite yet; the end-to-end demo flow is covered by `tests/unit/flow.test.ts`.
- `SupabaseRepository` is written against the schema and type-checked; migrations + seed were validated on Postgres 16, but the repository hasn't been run against a live Supabase project yet.
