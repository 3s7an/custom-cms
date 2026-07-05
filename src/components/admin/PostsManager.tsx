import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import TiptapEditor from "./TiptapEditor";



type Post = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  published_date: string | null;
  page_id: string;
  sort_order: number;
};

const NOVINKY_SLUG = "novinky";

const PostsManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [novinkyPageId, setNovinkyPageId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [publishedDate, setPublishedDate] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const [filterName, setFilterName] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [listBusy, setListBusy] = useState(false);

  const fetchData = async () => {
    const { data: novinkyPage } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", NOVINKY_SLUG)
      .maybeSingle();

    if (!novinkyPage?.id) {
      setNovinkyPageId(null);
      setPosts([]);
      return;
    }

    setNovinkyPageId(novinkyPage.id);
    const postsRes = await supabase
      .from("posts")
      .select("*")
      .eq("page_id", novinkyPage.id)
      .order("sort_order");
    if (postsRes.data) setPosts(postsRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setTitle(""); setContent(""); setPublished(false);
    setPublishedDate(""); setSortOrder(0); setEditing(null); setIsNew(false);
  };

  const startEdit = (p: Post) => {
    setTitle(p.title); setContent(p.content);
    setPublished(p.published); setSortOrder(p.sort_order);
    setPublishedDate(p.published_date ? p.published_date.split("T")[0] : "");
    setEditing(p); setIsNew(false);
  };

  const handleSave = async () => {
    if (!novinkyPageId) {
      toast({
        title: "Chyba",
        description: `V systéme chýba stránka so slugom „${NOVINKY_SLUG}“. Vytvorte ju v záložke Stránky.`,
        variant: "destructive",
      });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Chyba", description: "Vyplňte názov", variant: "destructive" });
      return;
    }
    const data: any = {
      title: title.trim(),
      content,
      page_id: novinkyPageId,
      published,
      published_date: publishedDate || null,
      sort_order: sortOrder,
    };

    if (editing) {
      const { error } = await supabase.from("posts").update(data).eq("id", editing.id);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Uložené" });
    } else {
      data.created_by = user?.id;
      const { error } = await supabase.from("posts").insert(data);
      if (error) { toast({ title: "Chyba", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Vytvorené" });
    }
    resetForm(); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Zmazať príspevok?")) return;
    await supabase.from("posts").delete().eq("id", id);
    fetchData();
  };

  const togglePublished = async (p: Post, value: boolean) => {
    setListBusy(true);
    try {
      const { error } = await supabase.from("posts").update({ published: value }).eq("id", p.id);
      if (error) throw error;
      setPosts((prev) => prev.map((x) => (x.id === p.id ? { ...x, published: value } : x)));
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

  const showForm = isNew || editing;

  const filteredPosts = posts.filter((p) => {
    if (filterName && !p.title.toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterDate && (!p.published_date || !p.published_date.startsWith(filterDate))) return false;
    return true;
  });

  return (
    <div>
      {!novinkyPageId && (
        <p className="text-destructive text-sm mb-4">
          Príspevky sa viažu na stránku „Novinky“ (slug <code className="font-mono">{NOVINKY_SLUG}</code>). V záložke Stránky ju najprv vytvorte.
        </p>
      )}
      {!showForm && (
        <Button
          onClick={() => { resetForm(); setIsNew(true); }}
          className="mb-4"
          disabled={!novinkyPageId}
        >
          <Plus className="w-4 h-4 mr-1" /> Nový príspevok
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">{editing ? "Upraviť príspevok" : "Nový príspevok"}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Príspevky sú len pre sekciu <strong>Novinky</strong> (verejná stránka /{NOVINKY_SLUG}).
          </p>
          <div className="mb-3">
            <Label>Názov</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xl" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Dátum publikácie</Label>
              <Input type="date" value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} />
            </div>
            <div>
              <Label>Poradie</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={published} onCheckedChange={setPublished} />
              <Label>Publikované</Label>
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
        <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44" />
      </div>

      <div className="space-y-2">
        {filteredPosts.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Žiadne príspevky.</p>
        ) : (
          filteredPosts.map((p) => (
            <div
              key={p.id}
              className={cn(
                "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
                editing?.id === p.id ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45" : "hover:bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold break-words">{p.title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Novinky · dátum {p.published_date?.split("T")[0] || "—"}
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
          ))
        )}
      </div>
    </div>
  );
};

export default PostsManager;
