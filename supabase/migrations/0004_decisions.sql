-- 0004 decisions & feedback reasons
create table public.feedback_reasons (
  code   text primary key,
  label  text not null
);
insert into public.feedback_reasons (code, label) values
  ('not_priority','Not a priority this quarter'),
  ('have_solution','Already have a solution'),
  ('budget','No budget for this'),
  ('wrong_person','Wrong person / team'),
  ('not_credible','Not convinced by the proof');

create table public.decisions (
  id           text primary key default gen_random_uuid()::text,
  pitch_id     text not null unique references public.pitches(id) on delete cascade,
  exec_id      text not null references public.exec_profiles(id) on delete cascade,
  action       text not null check (action in ('accept','pass')),
  reason_code  text references public.feedback_reasons(code),
  note         text not null default '',
  decided_at   timestamptz not null default now()
);
create index decisions_exec_idx on public.decisions(exec_id, decided_at desc);
