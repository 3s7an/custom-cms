# Bernardin — refaktor na „Leonberger štýl“ (Supabase-only admin)

Tento dokument je **jediný brief pre Cursor** pre refaktor projektu **`bernardin`** (`c:\Users\Tristan\Desktop\work\clients\bernardin`) tak, aby fungoval **rovnako ako `leonberger`**:

- **žiadny vlastný backend** (žiadny Node/Express API server),
- všetky CRUD operácie idú priamo cez **Supabase klienta z frontendu**,
- autentifikácia je **len pre admin panel**,
- admin oprávnenie je cez tabuľku **`public.admins`** (nie `user_roles`),
- verejný web ostáva bez prihlasovania (iba čítanie viditeľných stránok).

Admin panel v `bernardin` bude **jednoduchší**: správa **iba** tabuľky `pages` (create/update/delete), rovnako ako dnes, len s rovnakou auth/RLS architektúrou ako v `leonberger`.

---

## 0. Kontext: aktuálny stav `bernardin`

### Supabase
- **Klient**: [`bernardin/src/integrations/supabase/client.ts`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/integrations/supabase/client.ts) vytvára `createClient`, ale **nemá** fail-fast validáciu env premenných.
- **Typy**: [`bernardin/src/integrations/supabase/types.ts`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/integrations/supabase/types.ts) obsahujú `pages`, `user_roles`, `has_role`, `setup_first_admin`.

### Auth a admin
- Auth je cez [`bernardin/src/contexts/AuthContext.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/contexts/AuthContext.tsx)
  - `isAdmin` sa dnes zisťuje cez `supabase.rpc("has_role", { _role: "admin" })`.
- Máš stránku [`bernardin/src/pages/SetupAdmin.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/pages/SetupAdmin.tsx), ktorá volá RPC `setup_first_admin()` a priradí rolu v `user_roles`.
- Login stránka [`bernardin/src/pages/Login.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/pages/Login.tsx) obsahuje aj **registráciu** (`signUp`) — to je v rozpore s „Leonberger modelom“ (len admin login).

### Migrácie (aktuálne)
- [`bernardin/supabase/migrations/20260405201714_...sql`](c:/Users/Tristan/Desktop/work/clients/bernardin/supabase/migrations/20260405201714_ac6b1f47-d834-4388-8fa7-62774618f903.sql)
  - definuje `app_role`, `user_roles`, `has_role`, `pages`, RLS pre `pages`, storage bucket `page-images` + politiky založené na `has_role`.
- [`bernardin/supabase/migrations/20260405201932_...sql`](c:/Users/Tristan/Desktop/work/clients/bernardin/supabase/migrations/20260405201932_aa3f53a6-02a6-4dd3-a4e2-e54b6bf6092e.sql)
  - definuje `setup_first_admin()`.

---

## 1. Cieľový model (rovnaký princíp ako `leonberger`)

### Verejný web
- Návštevník je **anon**.
- Číta iba „publikovateľné“/viditeľné stránky (v `bernardin` je to `pages.is_visible = true`).

### Admin
- Jediný typ login-u: **Supabase Auth** (`signInWithPassword`).
- Admin oprávnenie: existuje riadok v **`public.admins`** s `user_id = auth.users.id`.
- Žiadna verejná registrácia.
- CRUD na `pages` a upload do `storage.page-images` len ak `is_admin(auth.uid()) = true`.

---

## 2. Databáza: nové migrácie pre `bernardin`

**Pravidlo:** existujúce migrácie **neprepisovať**. Všetko ako **nové** SQL súbory v [`bernardin/supabase/migrations/`](c:/Users/Tristan/Desktop/work/clients/bernardin/supabase/migrations/).

### 2.1 Pridať `public.admins` + `public.is_admin`

V novej migrácii vytvoriť:

- `public.admins`
  - `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `username text NOT NULL UNIQUE`
  - `created_at timestamptz NOT NULL DEFAULT now()`
- RLS:
  - **anon**: žiadne práva
  - `authenticated`: môže čítať **iba vlastný** riadok (`auth.uid() = user_id`)
- Funkcia `public.is_admin(_user_id uuid) RETURNS boolean`
  - `SECURITY DEFINER`, `STABLE`, `SET search_path = public`
  - `EXISTS (SELECT 1 FROM public.admins WHERE user_id = _user_id)`

### 2.2 Prepísať RLS politiky z `has_role` na `is_admin`

V rovnakej migrácii:

- `pages`:
  - drop + recreate politiky:
    - `"Admins can view all pages"`
    - `"Admins can insert pages"`
    - `"Admins can update pages"`
    - `"Admins can delete pages"`
  - podmienku zmeniť na `public.is_admin(auth.uid())`
- `storage.objects` (bucket `page-images`):
  - drop + recreate:
    - `"Admins can upload page images"` (INSERT)
    - `"Admins can update page images"` (UPDATE) — ak sa používa
    - `"Admins can delete page images"` (DELETE)
  - podmienku zmeniť na `public.is_admin(auth.uid())`

**Poznámka:** `user_roles`, `app_role`, `has_role` môžu ostať v schéme (kompatibilita), ale aplikácia ich po refaktore pre admin **nebude používať**.

---

## 3. Seed/admin onboarding (bez Dockera)

Keďže často nebude Docker, seed rieš ako v `leonberger`:

### 3.1 Vytvor admin používateľa v Supabase Dashboard

- Dashboard → Authentication → Users → **Add user**
  - napr. email `admin@bernardin.sk`
  - heslo (nastaví sa v Dashboarde)

### 3.2 Pridaj záznam do `public.admins`

V SQL Editore (po nasadení novej migrácie):

```sql
INSERT INTO public.admins (user_id, username)
SELECT id, 'bernardin'
FROM auth.users
WHERE email = 'admin@bernardin.sk'
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;
```

### 3.3 (Voliteľné) Seed skript pre lokál

Ak niekedy bude lokálny `supabase db reset` (Docker), môže existovať `bernardin/supabase/seed.sql` podobný `leonberger` (idempotentný: ak email existuje, len doplní `admins`).

---

## 4. Frontend refaktor (`bernardin/src`)

### 4.1 `supabase` klient: fail-fast env (kopírovať z `leonberger`)

Upraviť [`bernardin/src/integrations/supabase/client.ts`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/integrations/supabase/client.ts):

- ak chýba `VITE_SUPABASE_URL` alebo `VITE_SUPABASE_PUBLISHABLE_KEY`, `throw new Error(...)`
- ponechať `auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }`

### 4.2 Auth: prejsť z `user_roles/has_role` na `admins` (ako `leonberger`)

Upraviť [`bernardin/src/contexts/AuthContext.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/contexts/AuthContext.tsx):

- nahradiť `checkAdmin`:
  - z `supabase.rpc("has_role", ...)`
  - na `supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle()`
- upraviť listener `onAuthStateChange`, aby sa `isAdmin` nastavoval konzistentne (bez blikania pri refreshi tokenu), v štýle `leonberger/src/hooks/useAuth.tsx`.

### 4.3 Login: odstrániť registráciu, pridať „len admin“ flow

Upraviť [`bernardin/src/pages/Login.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/pages/Login.tsx):

- odstrániť `signUp` (registráciu) a UI prepínač
- po úspešnom `signIn` overiť, že user má riadok v `admins`
  - ak nie: `signOut` + chybová hláška „nemá prístup do administrácie“
- (voliteľné) podporiť „loginId“ podobne ako `leonberger`:
  - jedno pole „Email alebo používateľské meno“
  - mapovanie `bernardin` → `VITE_ADMIN_LOGIN_EMAIL` alebo default email

### 4.4 Zrušiť `setup-admin` onboarding (už nebude treba)

- odstrániť / odpojiť route `/setup-admin` v [`bernardin/src/App.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/App.tsx)
- stránku [`bernardin/src/pages/SetupAdmin.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/pages/SetupAdmin.tsx) buď zmazať, alebo nechať nepoužitú (odporúčané: odstrániť).
- v DB môže ostať funkcia `setup_first_admin()` (nevadí), len sa už nepoužíva.

### 4.5 Admin stránka

[`bernardin/src/pages/Admin.tsx`](c:/Users/Tristan/Desktop/work/clients/bernardin/src/pages/Admin.tsx) už robí CRUD na `pages` cez Supabase. Po zmene auth/RLS:

- overiť, že `enabled: isAdmin` query ostáva OK
- upload do bucketu `page-images` bude fungovať len pre admina podľa novej RLS politiky

---

## 5. Typy, env a dokumentácia

### 5.1 Regenerovať typy

Po nasadení migrácie:

- `npx supabase gen types typescript --local` (ak je Docker)
- alebo `npx supabase login` + `npx supabase link` + `npx supabase gen types typescript --project-id ...`
- `types.ts` musí obsahovať tabuľku `admins` a funkciu `is_admin`

### 5.2 `.env.example` a `.gitignore`

- `.env` necommitovať
- `.env.example` (bez tajomstiev) je vhodné **commitovať**, aby bolo jasné, aké premenné treba nastaviť (ak sa ho rozhodnete ignorovať, dokumentovať v README).

### 5.3 README

Do [`bernardin/README.md`](c:/Users/Tristan/Desktop/work/clients/bernardin/README.md) doplniť:

- ktoré env premenné treba (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, voliteľne `VITE_ADMIN_LOGIN_EMAIL`)
- že verejný web je anon, login je len pre admin
- ako pridať admina: Dashboard user + `INSERT INTO public.admins`

---

## 6. Test plan (manuálne)

- **Anon návštevník**:
  - domovská stránka a zobrazenie navigácie/stránok
  - routa stránky (`/stranka/:slug`) funguje pre `is_visible = true`
- **Admin**:
  - prihlásenie na `/login` (resp. premenované `/admin/login`, ak sa rozhodnete zjednotiť s leonberger)
  - CRUD na `pages` (create/update/delete)
  - upload obrázka do storage `page-images`
- **Ne-admin účet** (auth user bez záznamu v `admins`):
  - login sa síce autentifikuje, ale UI ho **odhlási** a nepustí do adminu

---

## 7. Poradie práce pre Cursor (konkrétne kroky)

1. **Inventúra**: prejsť `bernardin/src/pages/*` a `bernardin/src/contexts/AuthContext.tsx`, potvrdiť kde je login route a kde sa ťahajú stránky verejne.\n2. **DB migrácia**: pridať novú migráciu `admins + is_admin + RLS` (drop/recreate politík pre `pages` a `storage.objects`).\n3. **Onboarding admina**: v Supabase Dashboard vytvoriť používateľa a vložiť do `public.admins`.\n4. **Frontend**:\n   - `client.ts` env fail-fast\n   - `AuthContext` → `admins` check\n   - `Login` odstrániť registráciu + overiť admin po login-e\n   - odstrániť `SetupAdmin` route\n5. **Typy**: regenerovať `types.ts` (alebo manuálne upraviť dočasne, kým sa nezregeneruje).\n6. **Testy**: `npm run build`, `npm run test`, manuálne kliky podľa sekcie 6.\n+