# Leonberger klub

Webová aplikácia (Vite + React + Supabase). Verejný web je pre neprihlásených návštevníkov; prihlásenie slúži len na **admin** rozhranie (`/admin`).

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

Po `db reset` sa spustia migrácie a [`supabase/seed.sql`](supabase/seed.sql): vývojový administrátor (email `admin@leonberger.sk`, používateľské meno v tabuľke `admins`: `leonberger`, heslo v seede: `leonberger123`). Na produkcii heslo po prvom prihlásení zmeňte.

Ak vloženie do `auth.users` v SQL zlyhá (oprávnenia), vytvorte používateľa v Supabase Dashboard (Authentication) a potom v SQL Editori:

```sql
INSERT INTO public.admins (user_id, username) VALUES ('<uuid_z_auth_users>', 'leonberger');
```

**Existujúci projekt (predtým `user_roles`):** po nasadení migrácie majú zápis do CMS len používatelia s riadkom v `public.admins`. Starého admina pridajte napr. `INSERT INTO public.admins (user_id, username) VALUES ('…', 'váš_login');` — už **nie** cez `user_roles`.

## Testy

```bash
npm run test
```
