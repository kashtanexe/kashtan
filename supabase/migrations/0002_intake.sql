-- 0002 intake: inbound emails, vendors, contacts
create table public.vendors (
  id          text primary key default gen_random_uuid()::text,
  domain      text not null unique, -- company domain, or full address for free-mail senders
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.vendor_contacts (
  id          text primary key default gen_random_uuid()::text,
  vendor_id   text not null references public.vendors(id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  suppressed  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index vendor_contacts_vendor_idx on public.vendor_contacts(vendor_id);

create table public.inbound_emails (
  id                     text primary key default gen_random_uuid()::text,
  provider_message_id    text not null unique, -- Postmark MessageID: idempotency key
  exec_id                text references public.exec_profiles(id) on delete set null,
  route_type             text not null check (route_type in ('exec_forward','direct_to_alias','vendor_reply','unknown')),
  from_email             text not null,
  to_email               text not null default '',
  subject                text not null default '',
  original_sender_email  text,
  extraction_method      text,
  auth_verdict           text not null default '',
  outcome                text not null default '',
  note                   text not null default '',
  headers                jsonb,
  raw_payload            jsonb, -- purged after 90 days (see 0008)
  received_at            timestamptz not null default now()
);
create index inbound_emails_exec_idx on public.inbound_emails(exec_id, received_at desc);
