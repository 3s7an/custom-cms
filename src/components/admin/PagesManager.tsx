import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import TiptapEditor from "./TiptapEditor";

type Page = {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  published: boolean;
  sort_order: number;
  section_id: string | null;
  parent_page_id: string | null;
};

type Section = { id: string; title: string };

const PagesManager = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editing, setEditing] = useState<Page | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [parentPageId, setParentPageId] = useState("");
  const [published, setPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const [filterName, setFilterName] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [listBusy, setListBusy] = useState(false);

  const fetchData = async () => {
    const [pagesRes, sectionsRes] = await Promise.all([
      supabase.from("pages").select("id, title, slug, content, meta_title, meta_description, published, sort_order, section_id, parent_page_id").order("sort_order"),
      supabase.from("sections").select("id, title").order("sort_order"),
    ]);
    if (pagesRes.data) setPages(pagesRes.data);
    if (sectionsRes.data) setSections(sectionsRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const generateSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const resetForm = () => {
    setTitle(""); setSlug(""); setContent(""); setMetaTitle(""); setMetaDescription(""); setSectionId(""); setParentPageId("");
    setPublished(true); setSortOrder(0); setEditing(null); setIsNew(false);
  };

  const startEdit = (p: Page) => {
    setTitle(p.title); setSlug(p.slug); setContent(p.content);
    setMetaTitle(p.meta_title || "");
    setMetaDescription(p.meta_description || "");
    setSectionId(p.section_id || ""); setParentPageId(p.parent_page_id || "");
    setPublished(p.published); setSortOrder(p.sort_order);
    setEditing(p); setIsNew(false);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Chyba", description: "Vyplňte názov", variant: "destructive" }); return; }
    const data: any = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      content,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      published,
      sort_order: sortOrder,
      section_id: sectionId || null,
      parent_page_id: parentPageId || null,
    };

    if (editing) {
      const { error } = await supabase.from("pages").update(data).eq("id", editing.id);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Uložené" });
    } else {
      const { error } = await supabase.from("pages").insert(data);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vytvorené" });
    }
    resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Zmazať stránku?")) return;
    await supabase.from("pages").delete().eq("id", id);
    fetchData();
  };

  const togglePublished = async (p: Page, value: boolean) => {
    setListBusy(true);
    try {
      const { error } = await supabase.from("pages").update({ published: value }).eq("id", p.id);
      if (error) throw error;
      setPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: value } : x)));
      if (editing?.id === p.id) {
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

  const sectionName = (id: string | null) => sections.find((s) => s.id === id)?.title || "—";
  const parentPages = pages.filter((p) => sectionId && p.section_id === sectionId && p.id !== editing?.id);
  const showForm = isNew || editing;

  const filteredPages = pages.filter((p) => {
    if (filterName && !p.title.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterSection && p.section_id !== filterSection) return false;
    return true;
  });

  return (
    <div>
      {!showForm && (
        <Button onClick={() => { resetForm(); setIsNew(true); }} className="mb-4">
          <Plus className="w-4 h-4 mr-1" /> Nová stránka
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">{editing ? "Upraviť stránku" : "Nová stránka"}</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Názov</Label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!editing) setSlug(generateSlug(e.target.value)); }} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Meta title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Ak prázdne, použije sa názov stránky"
              />
              <p className="text-xs text-muted-foreground mt-1">Odporúčanie: do ~60 znakov.</p>
            </div>
            <div>
              <Label>Meta description</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Krátky popis stránky pre vyhľadávače"
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground mt-1">Odporúčanie: do ~160 znakov.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Sekcia</Label>
              <select className="w-full border border-border bg-background px-3 py-2 text-sm" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">— Žiadna —</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Nadradená stránka</Label>
              <select className="w-full border border-border bg-background px-3 py-2 text-sm" value={parentPageId} onChange={(e) => setParentPageId(e.target.value)}>
                <option value="">— Žiadna —</option>
                {parentPages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <Label>Poradie</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Switch checked={published} onCheckedChange={setPublished} />
            <Label>Publikované</Label>
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
        <select className="border border-border bg-background px-3 py-2 text-sm" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
          <option value="">Všetky sekcie</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {filteredPages.map((p) => (
          <div
            key={p.id}
            className={cn(
              "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
              editing?.id === p.id ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45" : "hover:bg-muted/30",
            )}
          >
            <div className="min-w-0 flex-1">
              <div className={`font-semibold break-words ${p.parent_page_id ? "border-l-2 border-slk-brown/30 pl-2" : ""}`}>
                {p.title}
              </div>
              <div className="text-sm text-muted-foreground break-words mt-0.5">
                <span className="font-mono text-xs">{p.slug}</span>
                {" · "}
                {sectionName(p.section_id)}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch checked={!!p.published} onCheckedChange={(v) => void togglePublished(p, v)} disabled={listBusy} />
                <span className="text-sm">{p.published ? "Publikované" : "Skryté"}</span>
              </div>
              <Button variant="outline" size="sm" onClick={() => startEdit(p)} disabled={listBusy} title="Upraviť">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)} disabled={listBusy} title="Zmazať">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PagesManager;
