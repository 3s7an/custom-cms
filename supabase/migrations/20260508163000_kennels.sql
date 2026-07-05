-- Breeding kennels (chovateľské stanice)

create extension if not exists pgcrypto;

CREATE TABLE IF NOT EXISTS public.kennels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  kennel_name text NOT NULL,
  breeder_name text,
  city text,
  address text,
  phone text,
  email text,
  website text,

  published boolean NOT NULL DEFAULT false,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT kennels_kennel_name_chk CHECK (char_length(trim(kennel_name)) > 0)
);

CREATE INDEX IF NOT EXISTS kennels_published_idx
  ON public.kennels(published);

CREATE INDEX IF NOT EXISTS kennels_kennel_name_idx
  ON public.kennels(kennel_name);

ALTER TABLE public.kennels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published kennels" ON public.kennels;
CREATE POLICY "Public can read published kennels"
ON public.kennels
FOR SELECT
TO anon, authenticated
USING (published = true);

DROP POLICY IF EXISTS "Public can submit kennel via form" ON public.kennels;
CREATE POLICY "Public can submit kennel via form"
ON public.kennels
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage kennels" ON public.kennels;
CREATE POLICY "Admins can manage kennels"
ON public.kennels
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_kennels_updated_at ON public.kennels;
CREATE TRIGGER update_kennels_updated_at
BEFORE UPDATE ON public.kennels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

