import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

type Row = {
  id: string;
  page_id: string;
  start_date: string; // yyyy-mm-dd
  end_date: string | null;
  place: string | null;
  description: string | null;
  created_at: string;
};

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Neznáma chyba";
}

const CalendarEventsManager = ({ pageId }: { pageId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");

  const ordered = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ad = a.start_date || "";
      const bd = b.start_date || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [rows]);

  const resetForm = () => {
    setEditingId(null);
    setStartDate("");
    setEndDate("");
    setPlace("");
    setDescription("");
  };

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("calendar_events")
      .select("id, page_id, start_date, end_date, place, description, created_at")
      .eq("page_id", pageId)
      .order("start_date", { ascending: false })
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    setRows((data as Row[]) || []);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setStartDate(row.start_date || "");
    setEndDate(row.end_date || "");
    setPlace(row.place || "");
    setDescription(row.description || "");
  };

  const handleDelete = async (row: Row) => {
    if (!confirm("Zmazať udalosť z kalendára?")) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("calendar_events").delete().eq("id", row.id);
      if (error) throw error;
      toast({ title: "Zmazané" });
      fetchRows();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!startDate) {
      toast({ title: "Chyba", description: "Vyplň dátum", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        page_id: pageId,
        start_date: startDate,
        end_date: endDate.trim() ? endDate.trim() : null,
        place: place.trim() || null,
        description: description.trim() || null,
      };

      if (editingId) {
        const { error } = await (supabase as any).from("calendar_events").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Uložené" });
      } else {
        const { error } = await (supabase as any).from("calendar_events").insert(payload);
        if (error) throw error;
        toast({ title: "Pridané" });
      }

      resetForm();
      fetchRows();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-background border border-border p-4">
        <h4 className="font-heading font-semibold mb-3">Kalendár (riadky)</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Dátum od</Label>
            <Input type="date" value={startDate} disabled={saving} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Dátum do (voliteľné)</Label>
            <Input type="date" value={endDate} disabled={saving} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Miesto</Label>
            <Input value={place} disabled={saving} onChange={(e) => setPlace(e.target.value)} placeholder="napr. Bratislava" />
          </div>
          <div className="md:col-span-2">
            <Label>Popis</Label>
            <Textarea
              value={description}
              disabled={saving}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px]"
              placeholder="napr. 2x Medzinárodná výstava CACIB"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Plus className="w-4 h-4 mr-1" />
            {editingId ? "Uložiť riadok" : "Pridať riadok"}
          </Button>
          <Button variant="outline" onClick={resetForm} disabled={saving}>
            Zrušiť
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-heading font-semibold">Zoznam</div>
        <div className="text-xs text-muted-foreground">{loading ? "Načítavam..." : `${ordered.length} riadkov`}</div>
      </div>

      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Zatiaľ žiadne udalosti.</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((r) => (
            <div
              key={r.id}
              className={cn(
                "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
                editingId === r.id
                  ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45"
                  : "hover:bg-muted/30",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold">
                  {r.start_date}
                  {r.end_date ? ` – ${r.end_date}` : ""}
                  {r.place ? ` · ${r.place}` : ""}
                </div>
                {r.description ? <div className="text-sm whitespace-pre-wrap mt-2">{r.description}</div> : null}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Button variant="outline" size="sm" onClick={() => startEdit(r)} disabled={saving} title="Upraviť">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(r)} disabled={saving} title="Zmazať">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarEventsManager;

