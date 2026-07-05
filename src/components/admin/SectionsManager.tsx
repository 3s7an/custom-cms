import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search } from "lucide-react";

type Section = {
  id: string;
  title: string;
  slug: string;
  sort_order: number;
};

const SectionsManager = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<Section[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [filterName, setFilterName] = useState("");

  const fetchSections = async () => {
    const { data } = await supabase
      .from("sections")
      .select("*")
      .order("sort_order");
    if (data) setSections(data);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const generateSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetForm = () => {
    setTitle(""); setSlug(""); setSortOrder(0);
    setEditing(null); setIsNew(false);
  };

  const startEdit = (s: Section) => {
    setTitle(s.title); setSlug(s.slug); setSortOrder(s.sort_order);
    setEditing(s); setIsNew(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Chyba", description: "Vyplňte názov", variant: "destructive" }); return; }
    const data = { title: title.trim(), slug: slug.trim() || generateSlug(title), sort_order: sortOrder };

    if (editing) {
      const { error } = await supabase.from("sections").update(data).eq("id", editing.id);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Uložené" });
    } else {
      const { error } = await supabase.from("sections").insert(data);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vytvorené" });
    }
    resetForm(); fetchSections();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Zmazať sekciu? Zmažú sa aj všetky stránky v nej.")) return;
    await supabase.from("sections").delete().eq("id", id);
    fetchSections();
  };

  const showForm = isNew || editing;
  const filteredSections = sections.filter((s) =>
    !filterName || s.title.toLowerCase().includes(filterName.toLowerCase())
  );

  return (
    <div>
      {!showForm && (
        <Button onClick={() => { resetForm(); setIsNew(true); }} className="mb-4">
          <Plus className="w-4 h-4 mr-1" /> Nová sekcia
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">{editing ? "Upraviť sekciu" : "Nová sekcia"}</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Názov</Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(generateSlug(e.target.value)); }} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <Label>Poradie</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
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
        {filteredSections.map((s) => (
          <div
            key={s.id}
            className={cn(
              "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
              editing?.id === s.id ? "bg-accent ring-2 ring-inset ring-primary/45" : "hover:bg-muted/30",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="font-semibold break-words">{s.title}</div>
              <div className="text-sm text-muted-foreground mt-0.5">
                <span className="font-mono text-xs">{s.slug}</span>
                {" · poradie "}
                {s.sort_order}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => startEdit(s)} title="Upraviť">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)} title="Zmazať">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionsManager;
