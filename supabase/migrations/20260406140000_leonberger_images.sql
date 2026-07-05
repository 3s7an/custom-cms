-- Gallery images for leonbergers (sortable + profile image flag)

CREATE TABLE IF NOT EXISTS public.leonberger_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leonberger_id uuid NOT NULL REFERENCES public.leonbergers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  alt text,
  sort_order integer NOT NULL DEFAULT 0,
  is_profile boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leonberger_images_leonberger_id_idx
  ON public.leonberger_images(leonberger_id);

ALTER TABLE public.leonberger_images ENABLE ROW LEVEL SECURITY;

-- Public can read images only for published leonbergers
DROP POLICY IF EXISTS "Public can read leonberger images" ON public.leonberger_images;
CREATE POLICY "Public can read leonberger images"
ON public.leonberger_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leonbergers l
    WHERE l.id = leonberger_id
      AND l.published = true
  )
);

-- Admins can manage everything
DROP POLICY IF EXISTS "Admins can manage leonberger images" ON public.leonberger_images;
CREATE POLICY "Admins can manage leonberger images"
ON public.leonberger_images
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

