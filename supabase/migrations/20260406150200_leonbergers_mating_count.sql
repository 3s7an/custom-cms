-- Počet krytí (psy); počet vrhov ostáva v litters_count (feny)

ALTER TABLE public.leonbergers
  ADD COLUMN IF NOT EXISTS mating_count integer;
