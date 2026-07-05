-- Add SEO fields to pages

alter table public.pages
  add column if not exists meta_title text,
  add column if not exists meta_description text;

