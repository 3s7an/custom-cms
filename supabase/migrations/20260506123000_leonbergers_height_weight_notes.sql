-- Optional notes for height/weight (e.g. age in months when measured)
ALTER TABLE public.leonbergers
  ADD COLUMN IF NOT EXISTS height_note text,
  ADD COLUMN IF NOT EXISTS weight_note text;

