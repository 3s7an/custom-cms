import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Upload } from "lucide-react";

type Row = {
  id: string;
  page_id: string;
  date: string; // yyyy-mm-dd
  show_type: string | null;
  place: string | null;
  judge: string | null;
  results_text: string | null;
  results_file_url: string | null;
  results_file_storage_path: string | null;
  gallery_url: string | null;
  created_at: string;
};

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Neznáma chyba";
}

async function uploadResultsFile(file: File) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const safeExt = ext && /^[a-z0-9]+$/.test(ext) ? ext : "bin";
  const path = `show-results/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  return { publicUrl: urlData.publicUrl, storagePath: path };
}

const ShowResultsManager = ({ pageId }: { pageId: string }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [showType, setShowType] = useState("");
  const [place, setPlace] = useState("");
  const [judge, setJudge] = useState("");
  const [resultsText, setResultsText] = useState("");
  const [galleryUrl, setGalleryUrl] = useState("");

  const [resultsFile, setResultsFile] = useState<File | null>(null);

  const orderedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ad = a.date || "";
      const bd = b.date || "";
      if (ad !== bd) return bd.localeCompare(ad);
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
  }, [rows]);

  const resetForm = () => {
    setEditingId(null);
    setDate("");
    setShowType("");
    setPlace("");
    setJudge("");
    setResultsText("");
    setGalleryUrl("");
    setResultsFile(null);
  };

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("show_results")
      .select(
        "id, page_id, date, show_type, place, judge, results_text, results_file_url, results_file_storage_path, gallery_url, created_at",
      )
      .eq("page_id", pageId)
      .order("date", { ascending: false })
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
    setDate(row.date || "");
    setShowType(row.show_type || "");
    setPlace(row.place || "");
    setJudge(row.judge || "");
    setResultsText(row.results_text || "");
    setGalleryUrl(row.gallery_url || "");
    setResultsFile(null);
  };

  const handleDelete = async (row: Row) => {
    if (!confirm("Zmazať riadok výsledkov?")) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("show_results").delete().eq("id", row.id);
      if (error) throw error;
      if (row.results_file_storage_path) {
        await supabase.storage.from("site-assets").remove([row.results_file_storage_path]);
      }
      toast({ title: "Zmazané" });
      fetchRows();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!date) {
      toast({ title: "Chyba", description: "Vyplň dátum", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let filePatch: Partial<Row> = {};
      if (resultsFile) {
        const { publicUrl, storagePath } = await uploadResultsFile(resultsFile);
        filePatch = { results_file_url: publicUrl, results_file_storage_path: storagePath } as any;
      }

      const payload: any = {
        page_id: pageId,
        date,
        show_type: showType.trim() || null,
        place: place.trim() || null,
        judge: judge.trim() || null,
        results_text: resultsText.trim() || null,
        gallery_url: galleryUrl.trim() || null,
        ...filePatch,
      };

      if (editingId) {
        const prev = rows.find((r) => r.id === editingId);
        const { error } = await supabase.from("show_results").update(payload).eq("id", editingId);
        if (error) throw error;

        // If we replaced a file, remove the previous one.
        if (resultsFile && prev?.results_file_storage_path) {
          await supabase.storage.from("site-assets").remove([prev.results_file_storage_path]);
        }
        toast({ title: "Uložené" });
      } else {
        const { error } = await supabase.from("show_results").insert(payload);
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
        <h4 className="font-heading font-semibold mb-3">Výsledky výstav (riadky)</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Dátum</Label>
            <Input type="date" value={date} disabled={saving} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Typ výstavy</Label>
            <Input value={showType} disabled={saving} onChange={(e) => setShowType(e.target.value)} placeholder="napr. CACIB" />
          </div>
          <div>
            <Label>Miesto</Label>
            <Input value={place} disabled={saving} onChange={(e) => setPlace(e.target.value)} placeholder="napr. Nitra" />
          </div>
          <div>
            <Label>Rozhodca</Label>
            <Input value={judge} disabled={saving} onChange={(e) => setJudge(e.target.value)} placeholder="Meno Priezvisko" />
          </div>
          <div className="md:col-span-2">
            <Label>Výsledky (text)</Label>
            <Textarea
              value={resultsText}
              disabled={saving}
              onChange={(e) => setResultsText(e.target.value)}
              className="min-h-[90px]"
              placeholder="napr. trieda otvorená: V1, CAC..."
            />
          </div>
          <div>
            <Label>Výsledky (súbor)</Label>
            <Input
              type="file"
              disabled={saving}
              accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setResultsFile(f);
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              (voliteľné) Nahraj PDF/DOC/XLS s výsledkami.
            </p>
          </div>
          <div>
            <Label>Galéria (link)</Label>
            <Input value={galleryUrl} disabled={saving} onChange={(e) => setGalleryUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Upload className="w-4 h-4 mr-1" />
            {editingId ? "Uložiť riadok" : "Pridať riadok"}
          </Button>
          <Button variant="outline" onClick={resetForm} disabled={saving}>
            Zrušiť
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-heading font-semibold">Zoznam</div>
        <div className="text-xs text-muted-foreground">{loading ? "Načítavam..." : `${orderedRows.length} riadkov`}</div>
      </div>

      {orderedRows.length === 0 ? (
        <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Zatiaľ žiadne výsledky.</p>
      ) : (
        <div className="space-y-2">
          {orderedRows.map((r) => (
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
                  {r.date}
                  {r.show_type ? ` · ${r.show_type}` : ""}
                  {r.place ? ` · ${r.place}` : ""}
                </div>
                {r.judge ? <div className="text-sm text-muted-foreground">Rozhodca: {r.judge}</div> : null}
                {r.results_text ? <div className="text-sm whitespace-pre-wrap mt-2">{r.results_text}</div> : null}
                <div className="text-sm mt-2 flex flex-wrap gap-3">
                  {r.results_file_url ? (
                    <a className="text-accent underline" href={r.results_file_url} target="_blank" rel="noopener noreferrer">
                      Súbor s výsledkami
                    </a>
                  ) : null}
                  {r.gallery_url ? (
                    <a className="text-accent underline" href={r.gallery_url} target="_blank" rel="noopener noreferrer">
                      Galéria
                    </a>
                  ) : null}
                </div>
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

export default ShowResultsManager;

