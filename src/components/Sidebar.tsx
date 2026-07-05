import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type PageItem = {
  id: string;
  title: string;
  slug: string;
  parent_page_id: string | null;
  sort_order: number;
};

type SectionData = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
  pages: PageItem[];
};

type RawSectionRow = { id: string; title: string; slug: string; sort_order: number };
type RawPageRow = { id: string; title: string; slug: string; section_id: string; parent_page_id: string | null; sort_order: number };

const Sidebar = () => {
  const [sections, setSections] = useState<SectionData[]>([]);

  useEffect(() => {
    const fetchSidebar = async () => {
      const [sectionsRes, pagesRes] = await Promise.all([
        supabase.from("sections").select("*").order("sort_order"),
        supabase
          .from("pages")
          .select("id, title, slug, section_id, parent_page_id, sort_order")
          .eq("published", true)
          .not("section_id", "is", null)
          .order("sort_order"),
      ]);

      if (sectionsRes.data && pagesRes.data) {
        const mapped: SectionData[] = (sectionsRes.data as RawSectionRow[]).map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          sort_order: s.sort_order,
          pages: (pagesRes.data as RawPageRow[])
            .filter((p) => p.section_id === s.id)
            .map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
              parent_page_id: p.parent_page_id,
              sort_order: p.sort_order,
            })),
        }));
        setSections(mapped);
      }
    };
    fetchSidebar();
  }, []);

  return (
    <nav className="w-full mt-[15px] lg:border-r lg:border-border">
      {sections.map((section) => (
        <div key={section.id} className="mb-0">
          <h3 className="bg-primary text-primary-foreground font-heading text-lg font-bold px-4 py-2 my-0">
            {section.title}
          </h3>
          <ul className="bg-secondary">
            {section.pages.map((page) => (
              <li key={page.id}>
                <NavLink
                  to={`/${page.slug}`}
                  className={({ isActive }) =>
                    [
                      "block py-1.5 text-foreground hover:bg-accent transition-colors px-[25px]",
                      isActive ? "underline underline-offset-2" : "",
                      page.parent_page_id ? "pl-8" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  {page.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default Sidebar;
