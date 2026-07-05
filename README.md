# CMS Template

Univerzálna, znovupoužiteľná CMS šablóna pre menšie weby (Vite + React + TypeScript + shadcn/ui + Supabase). Verejný web je pre neprihlásených návštevníkov; prihlásenie slúži len na **admin** rozhranie (`/admin`).

## Čo šablóna obsahuje

- **Stránky** (`pages`) – statické stránky s rich-text obsahom (Tiptap editor).
- **Príspevky / novinky** (`posts`) – blogový obsah zoradený podľa roka.
- **Oznamy** (`announcements`) – krátke oznamy v pravom paneli.
- **Sekcie** (`sections`) – zoskupenie stránok v navigácii.
- **Nastavenia stránky** (`site_settings`, `navbar_images`, `footer_links`) – logo, banner, pätička, identita webu.
- **Admin autentifikácia** – Supabase Auth + tabuľka `admins` + funkcia `is_admin()` + RLS.

Všetok obsah je dátovo riadený (žiadne natvrdo zadané menu ani texty konkrétneho webu). Identitu webu (názov, tagline, logo) nastavíte v admin paneli.

## Vývoj

Skopírujte `.env.example` na `.env` a vyplňte `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY` z projektu Supabase (Settings → API).

```bash
npm install
npm run dev
```

### Lokálna databáza (Supabase CLI + Docker)

```bash
npx supabase start
npx supabase db reset
```

Po `db reset` sa spustia migrácie a [`supabase/seed.sql`](supabase/seed.sql), ktorý vytvorí **vývojového** administrátora (email `admin@example.com`, používateľské meno `admin`, heslo `template`). Toto je len pre lokálny vývoj – na produkcii vytvorte admina cez Supabase Dashboard so silným heslom.

Ak vloženie do `auth.users` v SQL zlyhá (oprávnenia), vytvorte používateľa v Supabase Dashboard (Authentication) a potom v SQL Editori:

```sql
INSERT INTO public.admins (user_id, username) VALUES ('<uuid_z_auth_users>', 'admin');
```

### Vygenerovanie TypeScript typov

Po zmene schémy databázy pregenerujte typy z vášho Supabase projektu:

```bash
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Build

```bash
npm run build
```

Build najprv vygeneruje `public/sitemap.xml` a `public/robots.txt` z publikovaných stránok (`scripts/generate-sitemap.mjs`). Nastavte `VITE_SITE_URL` na kanonickú doménu webu.

## Testy

```bash
npm run test          # unit testy (Vitest)
npx playwright test   # e2e testy (Playwright)
```
