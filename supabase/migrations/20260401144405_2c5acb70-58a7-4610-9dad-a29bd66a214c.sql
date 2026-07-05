
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published announcements"
ON public.announcements FOR SELECT TO public
USING (published = true);

CREATE POLICY "Admins can view all announcements"
ON public.announcements FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'));
