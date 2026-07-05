-- Split mating sheets into FE sections (planned/current/overview)

alter table public.mating_sheets
  add column if not exists pregnancy_confirmed boolean not null default false,
  add column if not exists pregnancy_confirmed_date date,
  add column if not exists archived_in_overview boolean not null default false;

