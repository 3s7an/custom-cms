-- Calendar rows linked to a page (slug: kalendar)

create extension if not exists pgcrypto;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,

  start_date date not null,
  end_date date,
  place text,
  description text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_events_end_date_chk check (end_date is null or end_date >= start_date)
);

create index if not exists calendar_events_page_id_start_date_idx
  on public.calendar_events(page_id, start_date desc, created_at desc);

alter table public.calendar_events enable row level security;

drop policy if exists "Public can read calendar events" on public.calendar_events;
create policy "Public can read calendar events"
on public.calendar_events
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage calendar events" on public.calendar_events;
create policy "Admins can manage calendar events"
on public.calendar_events
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop trigger if exists update_calendar_events_updated_at on public.calendar_events;
create trigger update_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.update_updated_at_column();

