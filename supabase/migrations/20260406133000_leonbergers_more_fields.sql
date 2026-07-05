-- Add detailed fields for leonbergers entity (per card screenshot)

ALTER TABLE public.leonbergers
  ADD COLUMN IF NOT EXISTS sire_name text,
  ADD COLUMN IF NOT EXISTS dam_name text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS spkp integer,
  ADD COLUMN IF NOT EXISTS bonitation_code text,
  ADD COLUMN IF NOT EXISTS height_cm integer,
  ADD COLUMN IF NOT EXISTS weight_kg integer,
  ADD COLUMN IF NOT EXISTS other_exams text,
  ADD COLUMN IF NOT EXISTS litters_count integer,
  ADD COLUMN IF NOT EXISTS litters_note text,
  ADD COLUMN IF NOT EXISTS breeder_name text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_address text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS owner_web text,
  ADD COLUMN IF NOT EXISTS short_note text;

