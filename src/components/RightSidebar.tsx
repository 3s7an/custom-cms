import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Announcement = {
  id: string;
  title: string;
  content: string;
  sort_order: number;
};

const RightSidebar = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, sort_order")
        .eq("published", true)
        .order("sort_order");
      if (data) setAnnouncements(data);
    };
    fetch();
  }, []);

  return (
    <aside className="w-full min-w-0 max-w-full">
      {announcements.map((a) => (
        <div key={a.id} className="mb-6">
          <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-foreground mb-3 my-[5px]">
            <span className="bg-primary text-primary-foreground w-6 h-6 flex items-center justify-center text-sm font-bold">!</span>
            {a.title}
          </h3>
          <div className="overflow-x-auto">
            <div
              className="slk-rich p-0"
              dangerouslySetInnerHTML={{ __html: a.content }}
            />
          </div>
        </div>
      ))}
      {announcements.length === 0 && (
        <p className="text-sm text-muted-foreground text-center">Žiadne oznamy.</p>
      )}
    </aside>
  );
};

export default RightSidebar;
