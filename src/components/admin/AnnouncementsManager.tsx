import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2, Plus, Search, ArrowUp, ArrowDown } from "lucide-react";
import TiptapEditor from "./TiptapEditor";

type Announcement = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  sort_order: number;
};

const AnnouncementsManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const [filterName, setFilterName] = useState("");
  const [listBusy, setListBusy] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("sort_order");
    if (data) setItems(data);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(
    () => items.filter((a) => !filterName || a.title.toLowerCase().includes(filterName.toLowerCase())),
    [items, filterName],
  );

  const resetForm = () => {
    setTitle(""); setContent(""); setPublished(false);
    setSortOrder(0); setEditing(null); setIsNew(false);
  };

  const startEdit = (a: Announcement) => {
    setTitle(a.title); setContent(a.content);
    setPublished(a.published); setSortOrder(a.sort_order);
    setEditing(a); setIsNew(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Chyba", description: "Vyplňte názov", variant: "destructive" });
      return;
    }
    const data: any = {
      title: title.trim(),
      content,
      published,
      sort_order: sortOrder,
    };

    if (editing) {
      const { error } = await supabase.from("announcements").update(data).eq("id", editing.id);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Uložené" });
    } else {
      data.created_by = user?.id;
      const { error } = await supabase.from("announcements").insert(data);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vytvorené" });
    }
    resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Zmazať oznam?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    fetchData();
  };

  const handleMove = async (displayIndex: number, direction: "up" | "down") => {
    const list = filtered;
    const swapIndex = direction === "up" ? displayIndex - 1 : displayIndex + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;
    const a = list[displayIndex];
    const b = list[swapIndex];
    await Promise.all([
      supabase.from("announcements").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("announcements").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    fetchData();
  };

  const togglePublished = async (a: Announcement, value: boolean) => {
    setListBusy(true);
    try {
      const { error } = await supabase.from("announcements").update({ published: value }).eq("id", a.id);
      if (error) throw error;
      setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, published: value } : x)));
      if (editing?.id === a.id) {
        setPublished(value);
        setEditing((e) => (e ? { ...e, published: value } : null));
      }
    } catch (error: unknown) {
      const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Chyba";
      toast({ title: "Nepodarilo sa zmeniť publikovanie", description: msg, variant: "destructive" });
    } finally {
      setListBusy(false);
    }
  };

  const showForm = isNew || editing;

  return (
    <div>
      {!showForm && (
        <Button onClick={() => { resetForm(); setIsNew(true); }} className="mb-4">
          <Plus className="w-4 h-4 mr-1" /> Nový oznam
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">{editing ? "Upraviť oznam" : "Nový oznam"}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Názov</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poradie</Label>
                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={published} onCheckedChange={setPublished} />
                <Label>Publikované</Label>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <Label>Obsah</Label>
            <TiptapEditor content={content} onChange={setContent} key={editing?.id || "new"} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>{editing ? "Uložiť" : "Vytvoriť"}</Button>
            <Button variant="outline" onClick={resetForm}>Zrušiť</Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input placeholder="Hľadať podľa názvu..." value={filterName} onChange={(e) => setFilterName(e.target.value)} className="w-60" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Žiadne oznamy.</p>
        ) : (
          filtered.map((a, i) => (
            <div
              key={a.id}
              className={cn(
                "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
                editing?.id === a.id ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45" : "hover:bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold break-words">{a.title}</div>
                <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                  <span>Poradie {a.sort_order}</span>
                  <span className="text-border">|</span>
                  <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => void handleMove(i, "up")} disabled={i === 0 || listBusy}>
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => void handleMove(i, "down")}
                    disabled={i === filtered.length - 1 || listBusy}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch checked={!!a.published} onCheckedChange={(v) => void togglePublished(a, v)} disabled={listBusy} />
                  <span className="text-sm">{a.published ? "Publikované" : "Skryté"}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => startEdit(a)} disabled={listBusy} title="Upraviť">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(a.id)} disabled={listBusy} title="Zmazať">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementsManager;
