import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Trash2, Upload } from "lucide-react";

type ContactRow = Tables<"contacts">;

function getErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Neznáma chyba";
}

async function uploadToSiteAssets(path: string, file: File) {
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  return { publicUrl: urlData.publicUrl, storagePath: path };
}

const emptyDraft: TablesInsert<"contacts"> = {
  position_title: "",
  name: "",
  photo_storage_path: null,
  photo_url: null,
  email: null,
  phone: null,
  sort_order: 0,
  published: true,
};

const ContactsManager = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TablesInsert<"contacts">>(emptyDraft);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [r.position_title, r.name, r.email, r.phone].filter(Boolean).join(" · ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, position_title, name, photo_storage_path, photo_url, email, phone, sort_order, published, created_by, created_at, updated_at")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast({ title: "Nepodarilo sa načítať kontakty", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setDraft(emptyDraft);
    if (fileRef.current) fileRef.current.value = "";
  };

  const startEdit = (r: ContactRow) => {
    setEditingId(r.id);
    setDraft({
      position_title: r.position_title,
      name: r.name,
      photo_storage_path: r.photo_storage_path,
      photo_url: r.photo_url,
      email: r.email,
      phone: r.phone,
      sort_order: r.sort_order,
      published: r.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoUpload = async (file: File) => {
    try {
      setLoading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `contacts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file);
      setDraft((p) => ({ ...p, photo_url: publicUrl, photo_storage_path: storagePath }));
      toast({ title: "Foto nahraté" });
    } catch (e) {
      toast({ title: "Chyba", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async () => {
    const path = (draft.photo_storage_path || "").trim();
    setDraft((p) => ({ ...p, photo_url: null, photo_storage_path: null }));
    if (!path) return;
    try {
      await supabase.storage.from("site-assets").remove([path]);
    } catch {
      // ignore
    }
  };

  const save = async () => {
    const positionTitle = (draft.position_title || "").trim();
    const name = (draft.name || "").trim();
    if (!positionTitle || !name) {
      toast({ title: "Vyplň pozíciu a meno", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const patch: TablesUpdate<"contacts"> = {
          position_title: positionTitle,
          name,
          email: draft.email?.trim() ? draft.email.trim() : null,
          phone: draft.phone?.trim() ? draft.phone.trim() : null,
          photo_url: draft.photo_url?.trim() ? draft.photo_url.trim() : null,
          photo_storage_path: draft.photo_storage_path?.trim() ? draft.photo_storage_path.trim() : null,
          sort_order: Number.isFinite(Number(draft.sort_order)) ? Number(draft.sort_order) : 0,
          published: !!draft.published,
        };
        const { error } = await supabase.from("contacts").update(patch).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Uložené" });
      } else {
        const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
        const payload: TablesInsert<"contacts"> = {
          position_title: positionTitle,
          name,
          email: draft.email?.trim() ? draft.email.trim() : null,
          phone: draft.phone?.trim() ? draft.phone.trim() : null,
          photo_url: draft.photo_url?.trim() ? draft.photo_url.trim() : null,
          photo_storage_path: draft.photo_storage_path?.trim() ? draft.photo_storage_path.trim() : null,
          sort_order: maxOrder + 1,
          published: !!draft.published,
        };
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
        toast({ title: "Pridané" });
      }
      resetForm();
      await load();
    } catch (e) {
      toast({ title: "Nepodarilo sa uložiť", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (r: ContactRow) => {
    if (!window.confirm("Naozaj chcete odstrániť tento kontakt?")) return;
    setLoading(true);
    try {
      if (r.photo_storage_path?.trim()) {
        await supabase.storage.from("site-assets").remove([r.photo_storage_path.trim()]);
      }
      const { error } = await supabase.from("contacts").delete().eq("id", r.id);
      if (error) throw error;
      toast({ title: "Odstránené" });
      await load();
    } catch (e) {
      toast({ title: "Nepodarilo sa odstrániť", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateRow = async (id: string, patch: Partial<ContactRow>) => {
    const { error } = await supabase.from("contacts").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="border border-border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-heading text-lg font-bold">Kontakty</h2>
          {editingId ? (
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              Zrušiť úpravy
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Pozícia *</Label>
            <Input value={draft.position_title} onChange={(e) => setDraft((p) => ({ ...p, position_title: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Meno *</Label>
            <Input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input value={draft.email || ""} onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Telefón</Label>
            <Input value={draft.phone || ""} onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Poradie</Label>
            <Input
              type="number"
              value={String(draft.sort_order ?? 0)}
              onChange={(e) => setDraft((p) => ({ ...p, sort_order: Number(e.target.value) }))}
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={!!draft.published} onCheckedChange={(v) => setDraft((p) => ({ ...p, published: v }))} />
            <span className="text-sm">Publikované</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className="space-y-2">
            <Label>Foto</Label>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={loading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePhotoUpload(f);
              }}
            />
            {draft.photo_url ? (
              <div className="border border-border bg-slk-cream overflow-hidden w-[220px] aspect-[4/3]">
                <img src={draft.photo_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : null}
            {draft.photo_url ? (
              <Button type="button" variant="outline" onClick={removePhoto} disabled={loading}>
                Odstrániť foto
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={save} disabled={loading}>
            {editingId ? <Pencil className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {editingId ? "Uložiť" : "Pridať"}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            Obnoviť
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="text-sm text-muted-foreground shrink-0">
          {filtered.length} / {rows.length}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Žiadne záznamy.</p>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className={cn(
                "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
                editingId === r.id
                  ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45"
                  : "bg-background hover:bg-muted/30",
              )}
            >
              <div className="w-[120px] h-[80px] border border-border bg-slk-cream overflow-hidden flex items-center justify-center">
                {r.photo_url ? <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold break-words">{r.position_title}</div>
                <div className="text-sm text-muted-foreground break-words">
                  {[r.name, r.email, r.phone].filter((x) => (x || "").trim()).join(" · ") || "—"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`contact-sort-${r.id}`} className="text-sm whitespace-nowrap mb-0">
                    Poradie
                  </Label>
                  <Input
                    id={`contact-sort-${r.id}`}
                    type="number"
                    className="h-9 w-[4.5rem]"
                    value={r.sort_order}
                    disabled={loading}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, sort_order: v } : x)));
                    }}
                    onBlur={() => void updateRow(r.id, { sort_order: r.sort_order })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={r.published} onCheckedChange={(v) => void updateRow(r.id, { published: v })} disabled={loading} />
                  <span className="text-sm leading-none">{r.published ? "Publikované" : "Skryté"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => startEdit(r)} disabled={loading} title="Upraviť">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" className="h-9 w-9 p-0" onClick={() => void remove(r)} disabled={loading} title="Zmazať">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ContactsManager;

