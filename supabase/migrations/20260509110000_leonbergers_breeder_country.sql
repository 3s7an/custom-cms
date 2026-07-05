-- Add breeder country for detail display

alter table public.leonbergers
  add column if not exists breeder_country text;

