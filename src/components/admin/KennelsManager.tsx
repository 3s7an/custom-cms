import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

type KennelRow = Tables<"kennels">;

function getErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Neznáma chyba";
}

const emptyDraft: TablesInsert<"kennels"> = {
  kennel_name: "",
  breeder_name: null,
  city: null,
  address: null,
  phone: null,
  email: null,
  website: null,
  published: false,
};

const KennelsManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<KennelRow[]>([]);
  const [query, setQuery] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TablesInsert<"kennels">>(emptyDraft);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.kennel_name,
        r.breeder_name,
        r.city,
        r.address,
        r.phone,
        r.email,
        r.website,
      ]
        .filter(Boolean)
        .join(" · ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kennels")
        .select("id, kennel_name, breeder_name, city, address, phone, email, website, published, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast({ title: "Nepodarilo sa načítať chovateľské stanice", description: getErrorMessage(e), variant: "destructive" });
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
  };

  const startEdit = (r: KennelRow) => {
    setEditingId(r.id);
    setDraft({
      kennel_name: r.kennel_name,
      breeder_name: r.breeder_name,
      city: r.city,
      address: r.address,
      phone: r.phone,
      email: r.email,
      website: r.website,
      published: r.published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    const kennelName = (draft.kennel_name || "").trim();
    if (!kennelName) {
      toast({ title: "Vyplň registrovaný chov", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const patch: TablesUpdate<"kennels"> = {
          kennel_name: kennelName,
          breeder_name: draft.breeder_name?.trim() ? draft.breeder_name.trim() : null,
          city: draft.city?.trim() ? draft.city.trim() : null,
          address: draft.address?.trim() ? draft.address.trim() : null,
          phone: draft.phone?.trim() ? draft.phone.trim() : null,
          email: draft.email?.trim() ? draft.email.trim() : null,
          website: draft.website?.trim() ? draft.website.trim() : null,
          published: !!draft.published,
        };
        const { error } = await supabase.from("kennels").update(patch).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Uložené" });
      } else {
        const payload: TablesInsert<"kennels"> = {
          kennel_name: kennelName,
          breeder_name: draft.breeder_name?.trim() ? draft.breeder_name.trim() : null,
          city: draft.city?.trim() ? draft.city.trim() : null,
          address: draft.address?.trim() ? draft.address.trim() : null,
          phone: draft.phone?.trim() ? draft.phone.trim() : null,
          email: draft.email?.trim() ? draft.email.trim() : null,
          website: draft.website?.trim() ? draft.website.trim() : null,
          published: !!draft.published,
        };
        const { error } = await supabase.from("kennels").insert(payload);
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

  const remove = async (id: string) => {
    if (!window.confirm("Naozaj chcete odstrániť tento záznam?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("kennels").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Odstránené" });
      await load();
    } catch (e) {
      toast({ title: "Nepodarilo sa odstrániť", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const togglePublished = async (r: KennelRow, value: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("kennels").update({ published: value }).eq("id", r.id);
      if (error) throw error;
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, published: value } : x)));
    } catch (e) {
      toast({ title: "Nepodarilo sa zmeniť publikovanie", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-border p-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-heading text-lg font-bold">Chovateľské stanice</h2>
          {editingId ? (
            <Button variant="outline" onClick={resetForm} disabled={loading}>
              Zrušiť úpravy
            </Button>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Registrovaný chov *</Label>
            <Input
              value={draft.kennel_name}
              onChange={(e) => setDraft((p) => ({ ...p, kennel_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Meno chovateľa</Label>
            <Input
              value={draft.breeder_name || ""}
              onChange={(e) => setDraft((p) => ({ ...p, breeder_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Mesto</Label>
            <Input
              value={draft.city || ""}
              onChange={(e) => setDraft((p) => ({ ...p, city: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Adresa</Label>
            <Input
              value={draft.address || ""}
              onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Mobil</Label>
            <Input
              value={draft.phone || ""}
              onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label>E-mail</Label>
            <Input
              value={draft.email || ""}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Web</Label>
            <Input
              value={draft.website || ""}
              onChange={(e) => setDraft((p) => ({ ...p, website: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-2">
            <Switch checked={!!draft.published} onCheckedChange={(v) => setDraft((p) => ({ ...p, published: v }))} />
            <span className="text-sm">Publikované</span>
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
                  : "hover:bg-muted/30",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold break-words">{r.kennel_name}</div>
                <div className="text-sm text-muted-foreground break-words">
                  {[r.breeder_name, r.city, r.email, r.website].filter((x) => (x || "").trim()).join(" · ") || "—"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={r.published} onCheckedChange={(v) => togglePublished(r, v)} disabled={loading} />
                  <span className="text-sm">{r.published ? "Publikované" : "Skryté"}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => startEdit(r)} disabled={loading}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(r.id)} disabled={loading}>
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

export default KennelsManager;

