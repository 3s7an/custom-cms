-- Add slug to leonbergers for pretty URLs

alter table public.leonbergers
  add column if not exists slug text;

-- Allow nulls initially; enforce uniqueness when present
create unique index if not exists leonbergers_slug_uidx
  on public.leonbergers (slug)
  where slug is not null;

