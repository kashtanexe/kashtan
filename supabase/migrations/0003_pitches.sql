-- 0003 pitches, answers, scores
create type public.pitch_status as enum (
  'received','challenged','brief_submitted','awaiting_payment','scoring',
  'surfaced','filtered','accepted','passed','expired','refunded'
);

create table public.pitches (
  id                text primary key default gen_random_uuid()::text,
  exec_id           text not null references public.exec_profiles(id) on delete cascade,
  vendor_id         text not null references public.vendors(id),
  contact_id        text not null references public.vendor_contacts(id),
  source            text not null check (source in ('alias','forward','link')),
  status            public.pitch_status not null default 'received',
  token             text not null unique,
  fast_track        boolean not null default false,
  subject           text not null default '',
  original_snippet  text not null default '',
  inbound_email_id  text references public.inbound_emails(id) on delete set null,
  sla_deadline      timestamptz,
  reminder_sent_at  timestamptz,
  challenged_at     timestamptz,
  submitted_at      timestamptz,
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index pitches_exec_status_idx on public.pitches(exec_id, status, created_at desc);
create index pitches_vendor_idx on public.pitches(vendor_id);
create index pitches_contact_idx on public.pitches(contact_id, exec_id);

create table public.pitch_answers (
  pitch_id      text primary key references public.pitches(id) on delete cascade,
  contact_name  text not null default '',
  company_name  text not null default '',
  one_liner     text not null check (char_length(one_liner) <= 140),
  acv_band      text not null,
  timeline      text not null,
  compliance    text[] not null default '{}',
  proof_url     text not null default '',
  proof_text    text not null default '',
  created_at    timestamptz not null default now()
);

create table public.pitch_scores (
  pitch_id             text primary key references public.pitches(id) on delete cascade,
  hard_gates           jsonb not null,
  sub_scores           jsonb not null,
  total                int not null check (total between 0 and 100),
  tldr                 text[] not null default '{}',
  pros                 text[] not null default '{}',
  cons                 text[] not null default '{}',
  recommended_action   text not null check (recommended_action in ('accept','review','pass')),
  rationale            text not null default '',
  injection_suspected  boolean not null default false,
  scorer               text not null,
  model                text not null,
  prompt_version       text not null,
  priorities_version   int not null,
  created_at           timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger pitches_touch before update on public.pitches for each row execute function public.touch_updated_at();
