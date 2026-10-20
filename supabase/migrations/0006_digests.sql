-- 0006 digests, email events, suppressions, outbound log
create table public.digest_runs (
  id        text primary key default gen_random_uuid()::text,
  exec_id   text not null references public.exec_profiles(id) on delete cascade,
  week_key  text not null,
  sent_at   timestamptz not null default now(),
  stats     jsonb not null default '{}',
  unique (exec_id, week_key)
);

create table public.email_events (
  id                   text primary key default gen_random_uuid()::text,
  type                 text not null, -- Bounce, SpamComplaint, Delivery, SubscriptionChange
  email                text not null,
  provider_message_id  text,
  payload              jsonb,
  created_at           timestamptz not null default now()
);

create table public.suppressions (
  email       text primary key,
  reason      text not null,
  created_at  timestamptz not null default now()
);

create table public.outbox_emails (
  id                   text primary key default gen_random_uuid()::text,
  kind                 text not null,
  pitch_id             text references public.pitches(id) on delete set null,
  exec_id              text references public.exec_profiles(id) on delete set null,
  "from"               text not null,
  "to"                 text not null,
  reply_to             text,
  subject              text not null,
  html                 text not null,
  text                 text not null,
  headers              jsonb not null default '{}',
  stream               text not null,
  provider             text not null,
  provider_message_id  text,
  created_at           timestamptz not null default now()
);
create index outbox_emails_created_idx on public.outbox_emails(created_at desc);
