-- Template refactor: drop all Leonberger-domain tables, enums and columns.
--
-- Existing migrations are kept intact; this migration removes the domain
-- schema on top of them so the base template only retains the generic CMS
-- objects (admins, is_admin(), pages, posts, announcements, sections,
-- site_settings, navbar_images, footer_links) and the shared storage buckets
-- (post-images, site-assets).
--
-- DROP TABLE ... CASCADE also removes the table's RLS policies, triggers,
-- indexes and foreign-key references. No domain-specific storage buckets were
-- ever created (leonberger/kennel/contact images used the shared site-assets
-- bucket), so no buckets are dropped here.

-- Mating sheets (children first, though CASCADE makes order irrelevant)
DROP TABLE IF EXISTS public.mating_sheet_puppies CASCADE;
DROP TABLE IF EXISTS public.mating_sheet_sires CASCADE;
DROP TABLE IF EXISTS public.mating_sheets CASCADE;

-- Leonberger directory + gallery
DROP TABLE IF EXISTS public.leonberger_images CASCADE;
DROP TABLE IF EXISTS public.leonbergers CASCADE;

-- Breeding kennels
DROP TABLE IF EXISTS public.kennels CASCADE;

-- Committee / contacts directory
DROP TABLE IF EXISTS public.contacts CASCADE;

-- Show results + calendar (page-linked)
DROP TABLE IF EXISTS public.show_results CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;

-- Domain enums (only referenced by the tables dropped above)
DROP TYPE IF EXISTS public.mating_outcome;
DROP TYPE IF EXISTS public.dog_sex;

-- Remove the Leonberger listing mode from the generic pages table
ALTER TABLE public.pages
  DROP CONSTRAINT IF EXISTS pages_leonberger_list_mode_check;

ALTER TABLE public.pages
  DROP COLUMN IF EXISTS leonberger_list_mode;
