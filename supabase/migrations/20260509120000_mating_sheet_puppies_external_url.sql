-- Allow linking puppy name to external page (FE clickable)

alter table public.mating_sheet_puppies
  add column if not exists external_url text;

