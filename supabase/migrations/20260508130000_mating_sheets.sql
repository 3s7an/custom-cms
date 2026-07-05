-- Mating sheets (krycie listy) + sires + puppies

create extension if not exists pgcrypto;

-- Outcome enum for mating sheet result
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mating_outcome') THEN
    CREATE TYPE public.mating_outcome AS ENUM ('unknown', 'born', 'not_pregnant', 'lost');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.mating_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  sheet_number integer NOT NULL,
  sheet_year integer NOT NULL,

  kennel_name text NOT NULL,
  breeder_name text NOT NULL,

  dam_leonberger_id uuid REFERENCES public.leonbergers(id) ON DELETE SET NULL,
  dam_name_fallback text,

  issue_date date,
  mating_date date,

  outcome public.mating_outcome NOT NULL DEFAULT 'unknown',
  outcome_date date,

  litter_check_done boolean NOT NULL DEFAULT false,
  litter_check_date date,

  published boolean NOT NULL DEFAULT true,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mating_sheets_number_year_chk CHECK (sheet_number > 0 AND sheet_year >= 2000 AND sheet_year <= 2100)
);

CREATE UNIQUE INDEX IF NOT EXISTS mating_sheets_number_year_uidx
  ON public.mating_sheets(sheet_number, sheet_year);

CREATE INDEX IF NOT EXISTS mating_sheets_sheet_year_idx
  ON public.mating_sheets(sheet_year);

CREATE INDEX IF NOT EXISTS mating_sheets_dam_leonberger_id_idx
  ON public.mating_sheets(dam_leonberger_id);

ALTER TABLE public.mating_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published mating sheets" ON public.mating_sheets;
CREATE POLICY "Public can read published mating sheets"
ON public.mating_sheets
FOR SELECT
TO anon, authenticated
USING (published = true);

DROP POLICY IF EXISTS "Admins can manage mating sheets" ON public.mating_sheets;
CREATE POLICY "Admins can manage mating sheets"
ON public.mating_sheets
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_mating_sheets_updated_at ON public.mating_sheets;
CREATE TRIGGER update_mating_sheets_updated_at
BEFORE UPDATE ON public.mating_sheets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sires (requested studs) per sheet
CREATE TABLE IF NOT EXISTS public.mating_sheet_sires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.mating_sheets(id) ON DELETE CASCADE,
  sire_name text NOT NULL,
  country text,
  external_url text,
  is_used boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mating_sheet_sires_sheet_id_idx
  ON public.mating_sheet_sires(sheet_id);

-- Max 1 used sire per sheet
CREATE UNIQUE INDEX IF NOT EXISTS mating_sheet_sires_one_used_per_sheet_uidx
  ON public.mating_sheet_sires(sheet_id)
  WHERE is_used = true;

ALTER TABLE public.mating_sheet_sires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read sires for published mating sheets" ON public.mating_sheet_sires;
CREATE POLICY "Public can read sires for published mating sheets"
ON public.mating_sheet_sires
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mating_sheets s
    WHERE s.id = sheet_id
      AND s.published = true
  )
);

DROP POLICY IF EXISTS "Admins can manage mating sheet sires" ON public.mating_sheet_sires;
CREATE POLICY "Admins can manage mating sheet sires"
ON public.mating_sheet_sires
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Puppies (optional litter listing) per sheet
CREATE TABLE IF NOT EXISTS public.mating_sheet_puppies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.mating_sheets(id) ON DELETE CASCADE,
  name text NOT NULL,
  kennel_name text,
  sex public.dog_sex NOT NULL,
  spkp_number integer,
  photo_storage_path text,
  photo_url text,
  exterior_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mating_sheet_puppies_spkp_chk CHECK (spkp_number IS NULL OR (spkp_number >= 0 AND spkp_number <= 9999))
);

CREATE INDEX IF NOT EXISTS mating_sheet_puppies_sheet_id_idx
  ON public.mating_sheet_puppies(sheet_id);

ALTER TABLE public.mating_sheet_puppies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read puppies for published mating sheets" ON public.mating_sheet_puppies;
CREATE POLICY "Public can read puppies for published mating sheets"
ON public.mating_sheet_puppies
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mating_sheets s
    WHERE s.id = sheet_id
      AND s.published = true
  )
);

DROP POLICY IF EXISTS "Admins can manage mating sheet puppies" ON public.mating_sheet_puppies;
CREATE POLICY "Admins can manage mating sheet puppies"
ON public.mating_sheet_puppies
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

