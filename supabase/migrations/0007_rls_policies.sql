-- 0007 row-level security. The app's server code uses the service-role key (bypasses RLS)
-- and enforces ownership itself; these policies protect any anon/authenticated access.
alter table public.organizations     enable row level security;
alter table public.profiles          enable row level security;
alter table public.exec_profiles     enable row level security;
alter table public.exec_addresses    enable row level security;
alter table public.intake_aliases    enable row level security;
alter table public.exec_priorities   enable row level security;
alter table public.vendors           enable row level security;
alter table public.vendor_contacts   enable row level security;
alter table public.inbound_emails    enable row level security;
alter table public.pitches           enable row level security;
alter table public.pitch_answers     enable row level security;
alter table public.pitch_scores      enable row level security;
alter table public.feedback_reasons  enable row level security;
alter table public.decisions         enable row level security;
alter table public.payments          enable row level security;
alter table public.stripe_events     enable row level security;
alter table public.digest_runs       enable row level security;
alter table public.email_events      enable row level security;
alter table public.suppressions      enable row level security;
alter table public.outbox_emails     enable row level security;

-- Helpers (security definer so policies don't recurse through RLS)
create or replace function public.current_exec_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select id from public.exec_profiles where user_id = auth.uid()
$$;

create or replace function public.current_org_id() returns text
language sql stable security definer set search_path = public as $$
  select org_id from public.exec_profiles where user_id = auth.uid() limit 1
$$;

create or replace function public.current_org_is_pro() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select plan in ('pro','enterprise') from public.organizations where id = public.current_org_id()), false)
$$;

-- Organisations: members read their own org
create policy org_read on public.organizations for select to authenticated
  using (id = public.current_org_id());

-- Profiles: self
create policy profiles_self on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Exec profiles: owner full access; org colleagues read (team page)
create policy exec_owner on public.exec_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exec_org_read on public.exec_profiles for select to authenticated
  using (org_id = public.current_org_id());
-- Public "Pitch Me" page needs slug lookups; expose only via a view.
create or replace view public.public_exec_cards as
  select slug, full_name, title, company_name, company_size, bio, fast_track_enabled, fast_track_price_cents, currency, charity_enabled, charity_name
  from public.exec_profiles where onboarded_at is not null;
grant select on public.public_exec_cards to anon, authenticated;

create policy addresses_owner on public.exec_addresses for all to authenticated
  using (exec_id in (select public.current_exec_ids())) with check (exec_id in (select public.current_exec_ids()));
create policy aliases_owner on public.intake_aliases for all to authenticated
  using (exec_id in (select public.current_exec_ids())) with check (exec_id in (select public.current_exec_ids()));
create policy priorities_owner on public.exec_priorities for all to authenticated
  using (exec_id in (select public.current_exec_ids())) with check (exec_id in (select public.current_exec_ids()));

-- Pitches: owner; Pro orgs can read colleagues' pitches (shared vendor memory)
create policy pitches_owner on public.pitches for all to authenticated
  using (exec_id in (select public.current_exec_ids())) with check (exec_id in (select public.current_exec_ids()));
create policy pitches_team_read on public.pitches for select to authenticated
  using (public.current_org_is_pro() and exec_id in (select id from public.exec_profiles where org_id = public.current_org_id()));

create policy answers_owner on public.pitch_answers for select to authenticated
  using (pitch_id in (select id from public.pitches where exec_id in (select public.current_exec_ids())));
create policy scores_owner on public.pitch_scores for select to authenticated
  using (pitch_id in (select id from public.pitches where exec_id in (select public.current_exec_ids())));
create policy decisions_owner on public.decisions for all to authenticated
  using (exec_id in (select public.current_exec_ids())) with check (exec_id in (select public.current_exec_ids()));
create policy payments_owner on public.payments for select to authenticated
  using (pitch_id in (select id from public.pitches where exec_id in (select public.current_exec_ids())));
create policy inbound_owner on public.inbound_emails for select to authenticated
  using (exec_id in (select public.current_exec_ids()));
create policy digests_owner on public.digest_runs for select to authenticated
  using (exec_id in (select public.current_exec_ids()));
create policy outbox_owner on public.outbox_emails for select to authenticated
  using (exec_id in (select public.current_exec_ids()));

-- Vendors are visible to authenticated users who have a pitch from them
create policy vendors_read on public.vendors for select to authenticated
  using (id in (select vendor_id from public.pitches where exec_id in (select public.current_exec_ids())
                union select vendor_id from public.pitches where public.current_org_is_pro()
                  and exec_id in (select id from public.exec_profiles where org_id = public.current_org_id())));
create policy contacts_read on public.vendor_contacts for select to authenticated
  using (vendor_id in (select vendor_id from public.pitches where exec_id in (select public.current_exec_ids())));

create policy reasons_read on public.feedback_reasons for select to anon, authenticated using (true);

-- stripe_events, email_events, suppressions: service role only (no policies = no access).
