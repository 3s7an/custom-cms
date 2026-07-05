import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  page_id: string;
  start_date: string;
  end_date: string | null;
  place: string | null;
  description: string | null;
  created_at: string;
};

function formatDateRangeSk(start: string, end: string | null) {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  if (Number.isNaN(s.getTime())) return end ? `${start} – ${end}` : start;
  const fmt = new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" });
  const ss = fmt.format(s);
  if (!e || Number.isNaN(e.getTime())) return ss;
  const ee = fmt.format(e);
  return ss === ee ? ss : `${ss} – ${ee}`;
}

const CalendarTableContent = ({ pageId }: { pageId: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("calendar_events")
        .select("id, page_id, start_date, end_date, place, description, created_at")
        .eq("page_id", pageId)
        .order("start_date", { ascending: true })
        .order("created_at", { ascending: true });
      setLoading(false);
      if (!error) setRows((data as Row[]) || []);
    };
    run();
  }, [pageId]);

  const ordered = useMemo(() => {
    // FE: show in chronological order
    return [...rows].sort((a, b) => {
      const ad = a.start_date || "";
      const bd = b.start_date || "";
      if (ad !== bd) return ad.localeCompare(bd);
      return (a.created_at || "").localeCompare(b.created_at || "");
    });
  }, [rows]);

  if (loading) return <p className="text-muted-foreground">Načítavam…</p>;
  if (ordered.length === 0) return <p className="text-muted-foreground">Zatiaľ žiadne termíny.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-background border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="px-4 py-2 text-left whitespace-nowrap">Dátum</th>
            <th className="px-4 py-2 text-left whitespace-nowrap">Miesto</th>
            <th className="px-4 py-2 text-left">Popis</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2 font-semibold whitespace-nowrap">
                {formatDateRangeSk(r.start_date, r.end_date)}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">{r.place || "—"}</td>
              <td className="px-4 py-2">{r.description || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarTableContent;

