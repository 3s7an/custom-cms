-- CMS pages: optional Leonberger directory mode for public listing

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS leonberger_list_mode text;

ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_leonberger_list_mode_check;

ALTER TABLE public.pages
  ADD CONSTRAINT pages_leonberger_list_mode_check
  CHECK (
    leonberger_list_mode IS NULL
    OR leonberger_list_mode IN ('chovne_psy', 'chovne_feny', 'veterani')
  );
