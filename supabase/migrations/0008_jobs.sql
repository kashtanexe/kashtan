-- 0008 jobs & retention. Scheduling is done by Vercel Cron (vercel.json) hitting /api/cron/*.
-- If you prefer pg_cron, enable the extension in the Supabase dashboard and uncomment below.

-- GDPR retention: purge raw inbound bodies after 90 days, keep the structured pitch.
create or replace function public.purge_raw_inbound() returns void
language sql security definer set search_path = public as $$
  update public.inbound_emails set raw_payload = null, headers = null
  where received_at < now() - interval '90 days' and raw_payload is not null;
$$;

-- create extension if not exists pg_cron;
-- select cron.schedule('purge-raw-inbound', '0 3 * * *', $$select public.purge_raw_inbound()$$);
