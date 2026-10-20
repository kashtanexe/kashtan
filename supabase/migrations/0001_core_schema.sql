-- 0001 core: organisations, profiles, exec profiles, verified addresses, intake aliases, priorities
create extension if not exists pgcrypto;

create table public.organizations (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  domain      text not null default '',
  plan        text not null default 'free' check (plan in ('free','pro','enterprise')),
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  org_id      text references public.organizations(id) on delete set null,
  role        text not null default 'exec' check (role in ('exec','admin','member')),
  full_name   text not null default '',
  created_at  timestamptz not null default now()
);

create table public.exec_profiles (
  id                      text primary key default gen_random_uuid()::text,
  org_id                  text not null references public.organizations(id) on delete cascade,
  user_id                 uuid unique references auth.users(id) on delete set null,
  slug                    text not null unique check (slug ~ '^[a-z0-9-]{2,48}$'),
  full_name               text not null,
  title                   text not null default '',
  email                   text not null,
  company_name            text not null default '',
  company_size            text not null default '',
  timezone                text not null default 'Europe/Paris',
  bio                     text not null default '',
  threshold               int  not null default 85 check (threshold between 0 and 100),
  auto_unlock             boolean not null default false,
  auto_unlock_daily_cap   int  not null default 2,
  calendar_url            text not null default '',
  fast_track_enabled      boolean not null default true,
  fast_track_price_cents  int  not null default 3000 check (fast_track_price_cents >= 0),
  currency                text not null default 'EUR',
  charity_enabled         boolean not null default false,
  charity_name            text not null default '',
  onboarded_at            timestamptz,
  created_at              timestamptz not null default now()
);
create index exec_profiles_org_idx on public.exec_profiles(org_id);

-- Addresses allowed to forward mail on the exec's behalf (DMARC/DKIM still required).
create table public.exec_addresses (
  id          text primary key default gen_random_uuid()::text,
  exec_id     text not null references public.exec_profiles(id) on delete cascade,
  email       text not null,
  verified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (exec_id, email)
);
create index exec_addresses_email_idx on public.exec_addresses(lower(email));

-- <local_part>@in.domain is the public alias; <local_part>+<secret>@in.domain is the forwarding address.
create table public.intake_aliases (
  id          text primary key default gen_random_uuid()::text,
  exec_id     text not null unique references public.exec_profiles(id) on delete cascade,
  local_part  text not null unique check (local_part ~ '^[a-z0-9.\-]{2,64}$'),
  secret      text not null,
  created_at  timestamptz not null default now()
);

-- Versioned natural-language profile. Every score references the version it used.
create table public.exec_priorities (
  id                   text primary key default gen_random_uuid()::text,
  exec_id              text not null references public.exec_profiles(id) on delete cascade,
  version              int  not null,
  quarter              text not null,
  priorities           text[] not null default '{}',
  narrative            text not null default '',
  budget_min_eur       int  not null default 0,
  budget_max_eur       int  not null default 0,
  required_compliance  text[] not null default '{}',
  dealbreakers         text[] not null default '{}',
  created_at           timestamptz not null default now(),
  unique (exec_id, version)
);
