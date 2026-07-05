-- Contacts (kontakty) displayed on public page

create extension if not exists pgcrypto;

CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  position_title text NOT NULL,
  name text NOT NULL,

  photo_storage_path text,
  photo_url text,

  email text,
  phone text,

  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,

  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT contacts_position_title_chk CHECK (char_length(trim(position_title)) > 0),
  CONSTRAINT contacts_name_chk CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS contacts_sort_order_idx
  ON public.contacts(sort_order);

CREATE INDEX IF NOT EXISTS contacts_published_idx
  ON public.contacts(published);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published contacts" ON public.contacts;
CREATE POLICY "Public can read published contacts"
ON public.contacts
FOR SELECT
TO anon, authenticated
USING (published = true);

DROP POLICY IF EXISTS "Admins can manage contacts" ON public.contacts;
CREATE POLICY "Admins can manage contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

