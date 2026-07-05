
-- Create sections table
CREATE TABLE public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sections" ON public.sections
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage sections" ON public.sections
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add section_id to pages table
ALTER TABLE public.pages ADD COLUMN section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE;
ALTER TABLE public.pages ADD COLUMN parent_page_id uuid REFERENCES public.pages(id) ON DELETE SET NULL;

-- Create posts table
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  published_date timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts" ON public.posts
  FOR SELECT TO public USING (published = true);

CREATE POLICY "Admins can view all posts" ON public.posts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update posts" ON public.posts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete posts" ON public.posts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

CREATE POLICY "Anyone can view post images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'post-images');

CREATE POLICY "Admins can upload post images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'post-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete post images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'post-images' AND public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_sections_updated_at BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
