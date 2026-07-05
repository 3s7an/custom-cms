-- Site assets (logo) + navbar rotating images

-- Ensure uuid generator exists (Supabase usually has this already)
create extension if not exists pgcrypto;

-- Public settings table (readable by anyone, writable by admins)
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read site settings" on public.site_settings;
create policy "Anyone can read site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can upsert site settings" on public.site_settings;
create policy "Admins can upsert site settings"
on public.site_settings
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Navbar images table (public can read enabled images, admins can manage)
create table if not exists public.navbar_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url text not null,
  alt text,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.navbar_images enable row level security;

drop policy if exists "Public can read enabled navbar images" on public.navbar_images;
create policy "Public can read enabled navbar images"
on public.navbar_images
for select
to anon, authenticated
using (enabled = true);

drop policy if exists "Admins can manage navbar images" on public.navbar_images;
create policy "Admins can manage navbar images"
on public.navbar_images
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Storage bucket for site assets (logo + navbar images)
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do update set public = excluded.public;

-- Storage policies for site-assets bucket
drop policy if exists "Public can read site assets" on storage.objects;
create policy "Public can read site assets"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-assets');

drop policy if exists "Admins can upload site assets" on storage.objects;
create policy "Admins can upload site assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

drop policy if exists "Admins can update site assets" on storage.objects;
create policy "Admins can update site assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'site-assets' and public.is_admin(auth.uid()))
with check (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

drop policy if exists "Admins can delete site assets" on storage.objects;
create policy "Admins can delete site assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

