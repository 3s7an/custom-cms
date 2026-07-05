-- Admins table: single source of truth for admin access (replaces user_roles for admin checks in RLS)
CREATE TABLE public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own row"
ON public.admins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated via client; manage via Dashboard or seed

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE a.user_id = _user_id
  );
$$;

-- Replace RLS policies that used has_role(..., 'admin') with is_admin(auth.uid())

-- pages
DROP POLICY IF EXISTS "Admins can view all pages" ON public.pages;
DROP POLICY IF EXISTS "Admins can insert pages" ON public.pages;
DROP POLICY IF EXISTS "Admins can update pages" ON public.pages;
DROP POLICY IF EXISTS "Admins can delete pages" ON public.pages;

CREATE POLICY "Admins can view all pages"
ON public.pages FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert pages"
ON public.pages FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update pages"
ON public.pages FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete pages"
ON public.pages FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- sections
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;

CREATE POLICY "Admins can manage sections"
ON public.sections
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- posts
DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can insert posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Admins can view all posts"
ON public.posts FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update posts"
ON public.posts FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- storage.objects (post-images bucket)
DROP POLICY IF EXISTS "Admins can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete post images" ON storage.objects;

CREATE POLICY "Admins can upload post images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND public.is_admin(auth.uid())
);

CREATE POLICY "Admins can delete post images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'post-images'
  AND public.is_admin(auth.uid())
);

-- announcements
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

CREATE POLICY "Admins can view all announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- FK for posts.created_by (was uuid without reference)
ALTER TABLE public.posts
  ADD CONSTRAINT posts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL;
