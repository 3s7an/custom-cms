-- Footer: recommended links as images + editable contact settings

create extension if not exists pgcrypto;

CREATE TABLE IF NOT EXISTS public.footer_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  alt text,
  href text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS footer_links_sort_order_idx
  ON public.footer_links(sort_order);

ALTER TABLE public.footer_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read enabled footer links" ON public.footer_links;
CREATE POLICY "Public can read enabled footer links"
ON public.footer_links
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Admins can manage footer links" ON public.footer_links;
CREATE POLICY "Admins can manage footer links"
ON public.footer_links
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

