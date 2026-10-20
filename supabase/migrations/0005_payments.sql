-- 0005 payments (Fast-Track), refunds and SLA deadlines
create table public.payments (
  id                   text primary key default gen_random_uuid()::text,
  pitch_id             text not null references public.pitches(id) on delete cascade,
  provider             text not null check (provider in ('stripe','demo')),
  checkout_session_id  text not null unique,
  payment_intent_id    text,
  amount_cents         int not null,
  currency             text not null default 'EUR',
  status               text not null default 'pending' check (status in ('pending','paid','refunded','failed')),
  charity              boolean not null default false,
  sla_deadline         timestamptz,
  refund_id            text,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz,
  refunded_at          timestamptz
);
create index payments_pitch_idx on public.payments(pitch_id);
create index payments_sla_idx on public.payments(status, sla_deadline);

-- Stripe webhook idempotency
create table public.stripe_events (
  id          text primary key, -- event.id
  type        text not null,
  received_at timestamptz not null default now()
);
