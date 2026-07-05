-- Add long-form public note for leonberger detail page (separate from short_note)
ALTER TABLE public.leonbergers
  ADD COLUMN IF NOT EXISTS note text;

