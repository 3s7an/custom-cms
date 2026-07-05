import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LeonbergerCard, { type LeonbergerCardRow } from "./LeonbergerCard";
import type { LeonbergerListMode } from "@/lib/leonbergerDisplay";

type Props = { mode: LeonbergerListMode };

const LeonbergerListSection = ({ mode }: Props) => {
  const [rows, setRows] = useState<LeonbergerCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);

      let q = supabase
        .from("leonbergers")
        .select("id, slug, name, profile_image_url, birth_date, height_cm, weight_kg, bonitation_code, health")
        .eq("published", true)
        .eq("is_deceased", false);

      if (mode === "veterani") {
        q = q.eq("is_veteran", true);
      } else {
        q = q.eq("is_veteran", false).eq("sex", mode === "chovne_psy" ? "pes" : "suka");
      }

      const { data, error: fetchError } = await q.order("name");

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setRows([]);
      } else {
        setRows((data as LeonbergerCardRow[]) || []);
      }
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (loading) {
    return <p className="text-muted-foreground">Načítavam…</p>;
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  if (rows.length === 0) {
    return <p className="text-muted-foreground">Zatiaľ tu nie sú žiadne záznamy.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
      {rows.map((row) => (
        <LeonbergerCard key={row.id} row={row} />
      ))}
    </div>
  );
};

export default LeonbergerListSection;
