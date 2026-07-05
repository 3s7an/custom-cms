-- Show results (vysledky vystav) rows linked to a page (slug: vysledky)

create extension if not exists pgcrypto;

create table if not exists public.show_results (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,

  date date not null,
  show_type text,
  place text,
  judge text,
  results_text text,
  results_file_url text,
  results_file_storage_path text,
  gallery_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists show_results_page_id_date_idx
  on public.show_results(page_id, date desc, created_at desc);

alter table public.show_results enable row level security;

drop policy if exists "Public can read show results" on public.show_results;
create policy "Public can read show results"
on public.show_results
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage show results" on public.show_results;
create policy "Admins can manage show results"
on public.show_results
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop trigger if exists update_show_results_updated_at on public.show_results;
create trigger update_show_results_updated_at
before update on public.show_results
for each row execute function public.update_updated_at_column();

