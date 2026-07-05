-- Mark leonbergers as deceased (†) and hide from public lists

alter table public.leonbergers
  add column if not exists is_deceased boolean not null default false;

