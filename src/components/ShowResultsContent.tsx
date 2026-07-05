import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  page_id: string;
  date: string; // yyyy-mm-dd
  show_type: string | null;
  place: string | null;
  judge: string | null;
  results_text: string | null;
  results_file_url: string | null;
  gallery_url: string | null;
  created_at: string;
};

function formatDateSk(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const ShowResultsContent = ({ pageId }: { pageId: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("show_results")
        .select("id, page_id, date, show_type, place, judge, results_text, results_file_url, gallery_url, created_at")
        .eq("page_id", pageId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      setLoading(false);
      if (!error) setRows((data as Row[]) || []);
    };
    run();
  }, [pageId]);

  const ordered = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [rows]);

  if (loading) return <p className="text-muted-foreground">Načítavam…</p>;
  if (ordered.length === 0) return <p className="text-muted-foreground">Zatiaľ žiadne výsledky.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-background border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="px-4 py-2 text-left whitespace-nowrap">Dátum</th>
            <th className="px-4 py-2 text-left whitespace-nowrap">Typ</th>
            <th className="px-4 py-2 text-left whitespace-nowrap">Miesto</th>
            <th className="px-4 py-2 text-left whitespace-nowrap">Rozhodca</th>
            <th className="px-4 py-2 text-left">Výsledky</th>
            <th className="px-4 py-2 text-left whitespace-nowrap">Odkazy</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="px-4 py-2 font-semibold whitespace-nowrap">{formatDateSk(r.date)}</td>
              <td className="px-4 py-2 whitespace-nowrap">{r.show_type || "—"}</td>
              <td className="px-4 py-2 whitespace-nowrap">{r.place || "—"}</td>
              <td className="px-4 py-2 whitespace-nowrap">{r.judge || "—"}</td>
              <td className="px-4 py-2">
                {r.results_text ? <div className="whitespace-pre-wrap">{r.results_text}</div> : null}
                {r.results_file_url ? (
                  <div className={r.results_text ? "mt-2" : ""}>
                    <a className="text-accent underline" href={r.results_file_url} target="_blank" rel="noopener noreferrer">
                      Súbor
                    </a>
                  </div>
                ) : null}
                {!r.results_text && !r.results_file_url ? "—" : null}
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                {r.gallery_url ? (
                  <a className="text-accent underline" href={r.gallery_url} target="_blank" rel="noopener noreferrer">
                    Galéria
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShowResultsContent;

