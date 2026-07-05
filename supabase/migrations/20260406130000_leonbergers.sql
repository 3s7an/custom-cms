-- Leonberger entity (public directory item)
-- Stores variable health/test results in JSONB for flexibility.

-- Enum for sex/type: pes/suka
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dog_sex') THEN
    CREATE TYPE public.dog_sex AS ENUM ('pes', 'suka');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.leonbergers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sex public.dog_sex NOT NULL,
  is_veteran boolean NOT NULL DEFAULT false,

  -- Flexible, structured storage for values like:
  -- LPN1/LPN2: N/N, N/N; LEMP: N/N
  -- DBK/HD: A/A; DLK/ED: 0/0
  --
  -- Suggested shape:
  -- {
  --   "lpn1": "N/N",
  --   "lpn2": "N/N",
  --   "lemp": "N/N",
  --   "hd": { "left": "A", "right": "A" },
  --   "ed": { "left": "0", "right": "0" }
  -- }
  health jsonb NOT NULL DEFAULT '{}'::jsonb,

  profile_image_url text,
  published boolean NOT NULL DEFAULT true,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leonbergers ENABLE ROW LEVEL SECURITY;

-- Public can read only published records
DROP POLICY IF EXISTS "Anyone can view published leonbergers" ON public.leonbergers;
CREATE POLICY "Anyone can view published leonbergers"
ON public.leonbergers
FOR SELECT
TO anon, authenticated
USING (published = true);

-- Admins can manage everything
DROP POLICY IF EXISTS "Admins can manage leonbergers" ON public.leonbergers;
CREATE POLICY "Admins can manage leonbergers"
ON public.leonbergers
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Keep updated_at in sync
DROP TRIGGER IF EXISTS update_leonbergers_updated_at ON public.leonbergers;
CREATE TRIGGER update_leonbergers_updated_at
BEFORE UPDATE ON public.leonbergers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

