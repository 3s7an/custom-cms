import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type SheetRow = Tables<"mating_sheets">;
type SireRow = Tables<"mating_sheet_sires">;
type PuppyRow = Tables<"mating_sheet_puppies">;
type LeonbergerMini = { id: string; name: string; sex?: Enums<"dog_sex">; published?: boolean };

type SireDraft = Omit<TablesInsert<"mating_sheet_sires">, "sheet_id"> & { id?: string };
type PuppyDraft = Omit<TablesInsert<"mating_sheet_puppies">, "sheet_id"> & { id?: string };

function getErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Neznáma chyba";
}

function toIsoDate(value: string | null | undefined) {
  const t = (value || "").trim();
  return t ? t : null;
}

function formatDateSk(value: string | null | undefined) {
  const raw = (value || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function safeInt(value: string) {
  const t = value.trim();
  if (!t) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseSpkp4(value: string) {
  const t = value.trim();
  if (t === "") return null;
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 && n <= 9999 ? n : null;
}

async function uploadToSiteAssets(path: string, file: File) {
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  return { publicUrl: urlData.publicUrl, storagePath: path };
}

const OUTCOME_OPTIONS: Array<{ value: Enums<"mating_outcome"> | "pregnancy_confirmed"; label: string }> = [
  { value: "unknown", label: "Vydaný" },
  { value: "not_pregnant", label: "Nakryté" },
  { value: "pregnancy_confirmed", label: "Potvrdená gravidita" },
  { value: "born", label: "Narodené" },
];

const MatingSheetsManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [items, setItems] = useState<SheetRow[]>([]);
  const [leonbergers, setLeonbergers] = useState<LeonbergerMini[]>([]);

  const [editing, setEditing] = useState<SheetRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [filter, setFilter] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const [sheetNumber, setSheetNumber] = useState("");
  const [sheetYear, setSheetYear] = useState(String(new Date().getFullYear()));
  const [kennelName, setKennelName] = useState("");
  const [breederName, setBreederName] = useState("");
  const [published, setPublished] = useState(true);

  const [damId, setDamId] = useState("");

  const [issueDate, setIssueDate] = useState("");
  const [matingDate, setMatingDate] = useState("");
  const [outcome, setOutcome] = useState<Enums<"mating_outcome">>("unknown");
  const [outcomeDate, setOutcomeDate] = useState("");

  const [litterCheckDone, setLitterCheckDone] = useState(false);
  const [litterCheckDate, setLitterCheckDate] = useState("");

  const [pregnancyConfirmed, setPregnancyConfirmed] = useState(false);
  const [pregnancyConfirmedDate, setPregnancyConfirmedDate] = useState("");
  const [archivedInOverview, setArchivedInOverview] = useState(false);

  const outcomeUiValue: Enums<"mating_outcome"> | "pregnancy_confirmed" = pregnancyConfirmed
    ? "pregnancy_confirmed"
    : outcome;

  const [sires, setSires] = useState<SireDraft[]>([]);
  const [puppies, setPuppies] = useState<PuppyDraft[]>([]);
  const [listBusy, setListBusy] = useState(false);

  const puppyFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const leonbergerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leonbergers) m.set(l.id, l.name);
    return m;
  }, [leonbergers]);

  const fetchData = async () => {
    const [sheetsRes, leosRes] = await Promise.all([
      supabase
        .from("mating_sheets")
        .select("*")
        .order("sheet_year", { ascending: false })
        .order("sheet_number", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("leonbergers").select("id, name, sex, published").eq("sex", "suka").order("name"),
    ]);

    if (sheetsRes.error) toast({ title: "Chyba", description: sheetsRes.error.message, variant: "destructive" });
    if (leosRes.error) toast({ title: "Chyba", description: leosRes.error.message, variant: "destructive" });

    setItems((sheetsRes.data as SheetRow[]) || []);
    // Keep all females here (even unpublished), so older sheets can still reference them.
    setLeonbergers((leosRes.data as LeonbergerMini[]) || []);
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditing(null);
    setIsNew(false);
    setSheetNumber("");
    setSheetYear(String(new Date().getFullYear()));
    setKennelName("");
    setBreederName("");
    setPublished(true);
    setDamId("");
    setIssueDate("");
    setMatingDate("");
    setOutcome("unknown");
    setOutcomeDate("");
    setLitterCheckDone(false);
    setLitterCheckDate("");
    setPregnancyConfirmed(false);
    setPregnancyConfirmedDate("");
    setArchivedInOverview(false);
    setSires([]);
    setPuppies([]);
  };

  const startEdit = async (row: SheetRow) => {
    setEditing(row);
    setIsNew(false);

    setSheetNumber(String(row.sheet_number || ""));
    setSheetYear(String(row.sheet_year || ""));
    setKennelName(row.kennel_name || "");
    setBreederName(row.breeder_name || "");
    setPublished(!!row.published);

    setDamId(row.dam_leonberger_id || "");

    setIssueDate(row.issue_date || "");
    setMatingDate(row.mating_date || "");
    setOutcome(row.outcome || "unknown");
    setOutcomeDate(row.outcome_date || "");
    setLitterCheckDone(!!row.litter_check_done);
    setLitterCheckDate(row.litter_check_date || "");
    setPregnancyConfirmed(!!(row as any).pregnancy_confirmed);
    setPregnancyConfirmedDate(((row as any).pregnancy_confirmed_date as string | null) || "");
    setArchivedInOverview(!!(row as any).archived_in_overview);

    const [siresRes, pupsRes] = await Promise.all([
      supabase
        .from("mating_sheet_sires")
        .select("*")
        .eq("sheet_id", row.id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("mating_sheet_puppies")
        .select("*")
        .eq("sheet_id", row.id)
        .order("sort_order")
        .order("created_at"),
    ]);

    if (siresRes.error) {
      toast({ title: "Chyba", description: siresRes.error.message, variant: "destructive" });
      setSires([]);
    } else {
      setSires(((siresRes.data as SireRow[]) || []).map((x) => ({ ...x })));
    }

    if (pupsRes.error) {
      toast({ title: "Chyba", description: pupsRes.error.message, variant: "destructive" });
      setPuppies([]);
    } else {
      setPuppies(((pupsRes.data as PuppyRow[]) || []).map((x) => ({ ...x })));
    }
  };

  const showForm = isNew || editing;

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const y = filterYear.trim();
    return items.filter((x) => {
      if (y && String(x.sheet_year) !== y) return false;
      if (!q) return true;
      const damName =
        (x.dam_leonberger_id ? leonbergerNameById.get(x.dam_leonberger_id) : null) ||
        x.dam_name_fallback ||
        "";
      return (
        String(x.sheet_number).includes(q) ||
        String(x.sheet_year).includes(q) ||
        (x.kennel_name || "").toLowerCase().includes(q) ||
        (x.breeder_name || "").toLowerCase().includes(q) ||
        damName.toLowerCase().includes(q)
      );
    });
  }, [items, filter, filterYear, leonbergerNameById]);

  const setUsedSire = (idx: number, used: boolean) => {
    setSires((prev) =>
      prev.map((s, i) => ({
        ...s,
        is_used: used ? i === idx : i === idx ? false : !!s.is_used,
      })),
    );
  };

  const handleSave = async () => {
    const n = safeInt(sheetNumber);
    const y = safeInt(sheetYear);
    if (!n || !y) {
      toast({ title: "Chyba", description: "Vyplň číslo a rok listu.", variant: "destructive" });
      return;
    }
    if (!kennelName.trim() || !breederName.trim()) {
      toast({ title: "Chyba", description: "Vyplň registrovaný chov a meno chovateľa.", variant: "destructive" });
      return;
    }

    const usedCount = sires.filter((s) => !!s.is_used).length;
    if (usedCount > 1) {
      toast({ title: "Chyba", description: "Použitý môže byť označený len jeden plemenník.", variant: "destructive" });
      return;
    }

    const payloadBase: Omit<TablesUpdate<"mating_sheets">, "id"> = {
      sheet_number: n,
      sheet_year: y,
      kennel_name: kennelName.trim(),
      breeder_name: breederName.trim(),
      dam_leonberger_id: damId || null,
      dam_name_fallback: null,
      issue_date: toIsoDate(issueDate),
      mating_date: toIsoDate(matingDate),
      outcome,
      outcome_date: toIsoDate(outcomeDate),
      litter_check_done: !!litterCheckDone,
      litter_check_date: toIsoDate(litterCheckDate),
      pregnancy_confirmed: !!pregnancyConfirmed,
      pregnancy_confirmed_date: toIsoDate(pregnancyConfirmedDate),
      archived_in_overview: !!archivedInOverview,
      published: !!published,
    };

    try {
      let sheetId = editing?.id || null;

      if (editing) {
        const upd = await supabase.from("mating_sheets").update(payloadBase).eq("id", editing.id);
        if (upd.error) throw upd.error;
      } else {
        const insPayload: TablesInsert<"mating_sheets"> = {
          ...(payloadBase as any),
          created_by: user?.id || null,
        };
        const ins = await supabase.from("mating_sheets").insert(insPayload).select("id").single();
        if (ins.error) throw ins.error;
        sheetId = ins.data?.id || null;
      }

      if (!sheetId) throw new Error("Chýba ID krycieho listu");

      // Upsert children by replace-all strategy (simple + predictable)
      const delSires = await supabase.from("mating_sheet_sires").delete().eq("sheet_id", sheetId);
      if (delSires.error) throw delSires.error;
      const delPups = await supabase.from("mating_sheet_puppies").delete().eq("sheet_id", sheetId);
      if (delPups.error) throw delPups.error;

      const siresToInsert: TablesInsert<"mating_sheet_sires">[] = sires
        .filter((s) => (s.sire_name || "").trim())
        .map((s, idx) => ({
          sheet_id: sheetId,
          sire_name: (s.sire_name || "").trim(),
          country: (s.country || "").trim() || null,
          external_url: (s.external_url || "").trim() || null,
          is_used: !!s.is_used,
          sort_order: idx,
        }));
      if (siresToInsert.length > 0) {
        const insS = await supabase.from("mating_sheet_sires").insert(siresToInsert);
        if (insS.error) throw insS.error;
      }

      const pupsToInsert: TablesInsert<"mating_sheet_puppies">[] = puppies
        .filter((p) => (p.name || "").trim())
        .map((p, idx) => ({
          sheet_id: sheetId,
          name: (p.name || "").trim(),
          kennel_name: (p.kennel_name || "").trim() || null,
          sex: (p.sex as any) || "pes",
          spkp_number: typeof p.spkp_number === "number" ? p.spkp_number : null,
          photo_storage_path: (p.photo_storage_path || "").trim() || null,
          photo_url: (p.photo_url || "").trim() || null,
          external_url: (p.external_url || "").trim() || null,
          exterior_note: (p.exterior_note || "").trim() || null,
          sort_order: idx,
        }));
      if (pupsToInsert.length > 0) {
        const insP = await supabase.from("mating_sheet_puppies").insert(pupsToInsert);
        if (insP.error) throw insP.error;
      }

      toast({ title: "Uložené" });
      resetForm();
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const handleDelete = async (row: SheetRow) => {
    if (!confirm(`Zmazať krycí list ${row.sheet_number}/${row.sheet_year}?`)) return;

    try {
      const pupsRes = await supabase
        .from("mating_sheet_puppies")
        .select("photo_storage_path")
        .eq("sheet_id", row.id);
      const paths = (pupsRes.data || [])
        .map((x) => (x as { photo_storage_path: string | null }).photo_storage_path)
        .filter((p): p is string => !!p && p.trim().length > 0);
      if (paths.length > 0) {
        await supabase.storage.from("site-assets").remove(paths);
      }

      const del = await supabase.from("mating_sheets").delete().eq("id", row.id);
      if (del.error) throw del.error;
      toast({ title: "Zmazané" });
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err), variant: "destructive" });
    }
  };

  const togglePublished = async (row: SheetRow, value: boolean) => {
    setListBusy(true);
    try {
      const { error } = await supabase.from("mating_sheets").update({ published: value }).eq("id", row.id);
      if (error) throw error;
      setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, published: value } : x)));
      if (editing?.id === row.id) {
        setEditing((e) => (e ? { ...e, published: value } : null));
        setPublished(value);
      }
    } catch (err: unknown) {
      toast({ title: "Nepodarilo sa zmeniť publikovanie", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setListBusy(false);
    }
  };

  const addSire = () => {
    setSires((prev) => [
      ...prev,
      { sire_name: "", country: "", external_url: "", is_used: false, sort_order: prev.length },
    ]);
  };

  const addPuppy = () => {
    setPuppies((prev) => [
      ...prev,
      {
        name: "",
        kennel_name: "",
        sex: "pes",
        spkp_number: null,
        photo_storage_path: null,
        photo_url: null,
        external_url: "",
        exterior_note: "",
        sort_order: prev.length,
      },
    ]);
  };

  const uploadPuppyPhoto = async (idx: number, file: File) => {
    const sheetId = editing?.id;
    if (!sheetId) {
      toast({ title: "Najprv ulož list", description: "Foto k šteniatku sa dá nahrať až po uložení krycieho listu." });
      return;
    }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "bin";
    const path = `mating-sheets/${sheetId}/puppies/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    try {
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file);
      setPuppies((prev) =>
        prev.map((p, i) => (i === idx ? { ...p, photo_url: publicUrl, photo_storage_path: storagePath } : p)),
      );
      toast({ title: "Foto nahraté" });
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      const k = String(idx);
      const el = puppyFileInputRefs.current[k];
      if (el) el.value = "";
    }
  };

  const removePuppy = async (idx: number) => {
    const p = puppies[idx];
    if (!confirm("Odstrániť šteňa zo zoznamu?")) return;
    const path = (p.photo_storage_path || "").trim();
    if (path) await supabase.storage.from("site-assets").remove([path]);
    setPuppies((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {!showForm && (
        <Button
          onClick={() => {
            resetForm();
            setIsNew(true);
          }}
          className="mb-4"
        >
          <Plus className="w-4 h-4 mr-1" /> Nový krycí list
        </Button>
      )}

      {showForm ? (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">
            {editing ? `Upraviť krycí list ${editing.sheet_number}/${editing.sheet_year}` : "Nový krycí list"}
          </h3>

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <Label>Číslo</Label>
              <Input value={sheetNumber} onChange={(e) => setSheetNumber(e.target.value)} inputMode="numeric" />
            </div>
            <div>
              <Label>Rok</Label>
              <Input value={sheetYear} onChange={(e) => setSheetYear(e.target.value)} inputMode="numeric" />
            </div>
            <div className="col-span-2 flex items-end gap-2 pb-1">
              <Switch checked={published} onCheckedChange={setPublished} />
              <Label>Publikované</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Registrovaný chov</Label>
              <Input value={kennelName} onChange={(e) => setKennelName(e.target.value)} />
            </div>
            <div>
              <Label>Meno chovateľa</Label>
              <Input value={breederName} onChange={(e) => setBreederName(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label>Matka (link na kartu)</Label>
              <select
                className="w-full border border-border bg-background px-3 py-2 text-sm"
                value={damId}
                onChange={(e) => setDamId(e.target.value)}
              >
                <option value="">— Nevybrať —</option>
                {leonbergers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Výsledok</Label>
              <select
                className="w-full border border-border bg-background px-3 py-2 text-sm"
                value={outcomeUiValue}
                onChange={(e) => {
                  const v = e.target.value as Enums<"mating_outcome"> | "pregnancy_confirmed";
                  if (v === "pregnancy_confirmed") {
                    setPregnancyConfirmed(true);
                    // Keep a sensible base outcome for DB enum.
                    setOutcome("not_pregnant");
                  } else {
                    setPregnancyConfirmed(false);
                    setOutcome(v);
                  }
                }}
              >
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <Label>Vydaný KL</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label>Krytie</Label>
              <Input type="date" value={matingDate} onChange={(e) => setMatingDate(e.target.value)} />
            </div>
            <div>
              <Label>Narodenie</Label>
              <Input type="date" value={outcomeDate} onChange={(e) => setOutcomeDate(e.target.value)} />
            </div>
            <div>
              <Label>Kontrola vrhu</Label>
              <Input type="date" value={litterCheckDate} onChange={(e) => setLitterCheckDate(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Switch checked={litterCheckDone} onCheckedChange={setLitterCheckDone} />
            <Label>Vykonaná kontrola vrhu</Label>
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-heading font-bold">Vyžiadaní plemenníci</h4>
              <Button type="button" variant="outline" size="sm" onClick={addSire}>
                <Plus className="w-4 h-4 mr-1" /> Pridať plemenníka
              </Button>
            </div>

            {sires.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatiaľ nie sú pridaní plemenníci.</p>
            ) : (
              <div className="space-y-2">
                {sires.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border border-border bg-background p-2">
                    <div className="col-span-4">
                      <Label>Meno</Label>
                      <Input
                        value={s.sire_name || ""}
                        onChange={(e) =>
                          setSires((prev) => prev.map((x, i) => (i === idx ? { ...x, sire_name: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Krajina</Label>
                      <Input
                        value={s.country || ""}
                        onChange={(e) =>
                          setSires((prev) => prev.map((x, i) => (i === idx ? { ...x, country: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="col-span-4">
                      <Label>Externý link</Label>
                      <Input
                        value={s.external_url || ""}
                        onChange={(e) =>
                          setSires((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, external_url: e.target.value } : x)),
                          )
                        }
                      />
                    </div>
                    <div className="col-span-1 flex items-end gap-2 pb-1">
                      <input
                        type="checkbox"
                        checked={!!s.is_used}
                        onChange={(e) => setUsedSire(idx, e.target.checked)}
                        className="h-4 w-4"
                        title="Označiť ako použitý"
                      />
                      <span className="text-xs text-muted-foreground">Použitý</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSires((prev) => prev.filter((_, i) => i !== idx))}
                        title="Odstrániť"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-heading font-bold">Šteniatka (voliteľné)</h4>
              <Button type="button" variant="outline" size="sm" onClick={addPuppy}>
                <Plus className="w-4 h-4 mr-1" /> Pridať šteňa
              </Button>
            </div>

            {puppies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zatiaľ nie sú pridané šteniatka.</p>
            ) : (
              <div className="space-y-2">
                {puppies.map((p, idx) => (
                  <div key={idx} className="border border-border bg-background p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label>Meno</Label>
                        <Input
                          value={p.name || ""}
                          onChange={(e) =>
                            setPuppies((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                          }
                        />
                      </div>
                      <div className="col-span-4">
                        <Label>Link (klikateľné meno na webe)</Label>
                        <Input
                          value={(p as any).external_url || ""}
                          onChange={(e) =>
                            setPuppies((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, external_url: e.target.value } : x)),
                            )
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Chovka</Label>
                        <Input
                          value={p.kennel_name || ""}
                          onChange={(e) =>
                            setPuppies((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, kennel_name: e.target.value } : x)),
                            )
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Pohlavie</Label>
                        <select
                          className="w-full border border-border bg-background px-3 py-2 text-sm"
                          value={(p.sex as any) || "pes"}
                          onChange={(e) =>
                            setPuppies((prev) => prev.map((x, i) => (i === idx ? { ...x, sex: e.target.value as any } : x)))
                          }
                        >
                          <option value="pes">Pes</option>
                          <option value="suka">Suka</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Label>SPKP (4 čísla)</Label>
                        <Input
                          inputMode="numeric"
                          value={p.spkp_number == null ? "" : String(p.spkp_number)}
                          onChange={(e) => {
                            const n2 = parseSpkp4(e.target.value);
                            setPuppies((prev) => prev.map((x, i) => (i === idx ? { ...x, spkp_number: n2 } : x)));
                          }}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        <Button type="button" variant="ghost" size="icon" onClick={() => void removePuppy(idx)} title="Odstrániť šteňa">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 mt-3 items-start">
                      <div className="col-span-3">
                        <Label>Foto (miniatúra)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={(el) => {
                              puppyFileInputRefs.current[String(idx)] = el;
                            }}
                            type="file"
                            accept="image/*"
                            disabled={!editing}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void uploadPuppyPhoto(idx, f);
                            }}
                          />
                        </div>
                        {p.photo_url ? (
                          <div className="mt-2 border border-border bg-slk-cream overflow-hidden w-full aspect-[4/3] flex items-center justify-center">
                            <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : null}
                      </div>
                      <div className="col-span-9">
                        <Label>Exteriér (krátky text)</Label>
                        <textarea
                          className="w-full min-h-[96px] border border-border bg-background px-3 py-2 text-sm"
                          value={p.exterior_note || ""}
                          onChange={(e) =>
                            setPuppies((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, exterior_note: e.target.value } : x)),
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>{editing ? "Uložiť" : "Vytvoriť"}</Button>
            <Button variant="outline" onClick={resetForm}>
              Zrušiť
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-64"
          />
        </div>
        <Input
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="w-24"
          inputMode="numeric"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Žiadne záznamy.</p>
        ) : (
          filtered.map((row) => {
            const dam =
              (row.dam_leonberger_id ? leonbergerNameById.get(row.dam_leonberger_id) : null) ||
              row.dam_name_fallback ||
              "—";
            return (
              <div
                key={row.id}
                className={cn(
                  "border border-border p-3 flex flex-col md:flex-row md:items-center gap-3",
                  editing?.id === row.id
                    ? "bg-slk-brown-light ring-2 ring-inset ring-slk-brown/45"
                    : "hover:bg-muted/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">
                    List {row.sheet_number}/{row.sheet_year}
                    <span className="text-muted-foreground font-normal"> · {dam}</span>
                  </div>
                  <div className="text-sm text-muted-foreground break-words mt-0.5">
                    <span className="font-medium text-foreground">{row.kennel_name}</span>
                    {row.breeder_name ? ` · ${row.breeder_name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!row.published}
                      onCheckedChange={(v) => void togglePublished(row, v)}
                      disabled={listBusy}
                    />
                    <span className="text-sm">{row.published ? "Publikované" : "Skryté"}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => void startEdit(row)} disabled={listBusy} title="Upraviť">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => void handleDelete(row)} disabled={listBusy} title="Zmazať">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MatingSheetsManager;

