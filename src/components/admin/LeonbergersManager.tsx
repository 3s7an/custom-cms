import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TiptapEditor from "./TiptapEditor";

type Health = {
  lpn1?: string;
  lpn2?: string;
  lpn3?: string;
  lemp?: string;
  hd?: { left?: string; right?: string };
  ed?: { left?: string; right?: string };
};

type LeonbergerRow = {
  id: string;
  name: string;
  sex: "pes" | "suka";
  is_veteran: boolean;
  is_deceased: boolean;
  published: boolean;
  profile_image_url: string | null;
  health: Health | null;
  short_note: string | null;
  note: string | null;
  sire_name: string | null;
  dam_name: string | null;
  birth_date: string | null;
  spkp: number | null;
  bonitation_code: string | null;
  height_cm: number | null;
  height_note: string | null;
  weight_kg: number | null;
  weight_note: string | null;
  other_exams: string | null;
  litters_count: number | null;
  litters_note: string | null;
  mating_count: number | null;
  breeder_name: string | null;
  owner_name: string | null;
  owner_address: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  owner_web: string | null;
  pedigree_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type LeonbergerImageRow = {
  id: string;
  leonberger_id: string;
  storage_path: string;
  public_url: string;
  alt: string | null;
  sort_order: number;
  is_profile: boolean;
  created_at: string;
};

function normalizePair(v: string) {
  const t = (v || "").trim();
  if (!t) return "";
  // allow A/A, N/N, 0/0, etc. Keep as-is but normalize separator.
  return t.replace(/\s+/g, "").replace(/⁄/g, "/");
}

/** Safe integer for DB; empty → null (fix accidental NaN from Number()). */
function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isNaN(n) ? null : n;
}

/** Desatinné číslo (desatinná čiarka alebo bodka); empty → null. */
function parseOptionalDecimal(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number.parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

function safeHealth(v: unknown): Health {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  return v as Health;
}

function getErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Neznáma chyba";
}

function extFromName(name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ext && /^[a-z0-9]+$/.test(ext) ? ext : "bin";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function GalleryItem({
  row,
  onDelete,
  isFirst,
}: {
  row: LeonbergerImageRow;
  onDelete: (row: LeonbergerImageRow) => void;
  isFirst: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border border-border bg-background p-2 select-none"
      {...attributes}
    >
      <div
        className="aspect-[4/3] bg-slk-cream border border-border overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        {...listeners}
        title="Potiahni myšou pre zmenu poradia"
      >
        <img src={row.public_url} alt={row.alt || ""} className="w-full h-full object-cover" />
      </div>

      <div className="flex items-center justify-between gap-2 mt-2">
        <div className="min-h-[26px] flex items-center">
          {isFirst ? (
            <span className="text-xs px-2 py-1 border border-border bg-slk-brown text-slk-cream">
              Profilová
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs px-2 py-1 border border-border bg-destructive text-destructive-foreground"
            onClick={() => onDelete(row)}
            title="Zmazať"
          >
            Zmazať
          </button>
        </div>
      </div>
    </div>
  );
}

const LeonbergersManager = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [items, setItems] = useState<LeonbergerRow[]>([]);
  const [editing, setEditing] = useState<LeonbergerRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [autoDraft, setAutoDraft] = useState(false);

  const [filterName, setFilterName] = useState("");
  const [listBusy, setListBusy] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [sex, setSex] = useState<"pes" | "suka">("pes");
  const [isVeteran, setIsVeteran] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);
  const [published, setPublished] = useState(true);
  const [shortNote, setShortNote] = useState("");
  const [note, setNote] = useState("");

  const [sireName, setSireName] = useState("");
  const [damName, setDamName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [spkp, setSpkp] = useState("");
  const [bonitationCode, setBonitationCode] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightNote, setHeightNote] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [weightNote, setWeightNote] = useState("");
  const [otherExams, setOtherExams] = useState("");
  const [littersCount, setLittersCount] = useState("");
  const [matingCount, setMatingCount] = useState("");
  const [littersNote, setLittersNote] = useState("");
  const [breederName, setBreederName] = useState("");
  const [breederCountry, setBreederCountry] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerWeb, setOwnerWeb] = useState("");
  const [pedigreeUrl, setPedigreeUrl] = useState("");

  const [lpn1, setLpn1] = useState("");
  const [lpn2, setLpn2] = useState("");
  const [lpn3, setLpn3] = useState("");
  const [lemp, setLemp] = useState("");
  const [hdLeft, setHdLeft] = useState("");
  const [hdRight, setHdRight] = useState("");
  const [edLeft, setEdLeft] = useState("");
  const [edRight, setEdRight] = useState("");

  const [gallery, setGallery] = useState<LeonbergerImageRow[]>([]);
  const galleryUploadRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("leonbergers")
      .select("id, slug, name, sex, is_veteran, is_deceased, published, profile_image_url, health, short_note, note, sire_name, dam_name, birth_date, spkp, bonitation_code, height_cm, height_note, weight_kg, weight_note, other_exams, litters_count, litters_note, mating_count, breeder_name, breeder_country, owner_name, owner_address, owner_phone, owner_email, owner_web, pedigree_url, created_by, created_at, updated_at")
      .order("name");
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data as LeonbergerRow[]) || []);
  };

  const fetchGallery = async (leonbergerId: string) => {
    const { data, error } = await supabase
      .from("leonberger_images")
      .select("id, leonberger_id, storage_path, public_url, alt, sort_order, is_profile, created_at")
      .eq("leonberger_id", leonbergerId)
      .order("sort_order")
      .order("created_at");
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      setGallery([]);
      return;
    }
    setGallery((data as LeonbergerImageRow[]) || []);
  };

  const syncProfileToFirst = async (leonbergerId: string, nextGallery: LeonbergerImageRow[]) => {
    const first = nextGallery[0];

    // Keep DB in sync (optional column, but useful)
    const unset = await supabase
      .from("leonberger_images")
      .update({ is_profile: false })
      .eq("leonberger_id", leonbergerId);
    if (unset.error) throw unset.error;

    if (first) {
      const setOne = await supabase.from("leonberger_images").update({ is_profile: true }).eq("id", first.id);
      if (setOne.error) throw setOne.error;

      const upd = await supabase
        .from("leonbergers")
        .update({ profile_image_url: first.public_url })
        .eq("id", leonbergerId);
      if (upd.error) throw upd.error;
    } else {
      const upd = await supabase
        .from("leonbergers")
        .update({ profile_image_url: null })
        .eq("id", leonbergerId);
      if (upd.error) throw upd.error;
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setName("");
    setSex("pes");
    setIsVeteran(false);
    setPublished(true);
    setShortNote("");
    setNote("");
    setSireName("");
    setDamName("");
    setBirthDate("");
    setSpkp("");
    setBonitationCode("");
    setHeightCm("");
    setHeightNote("");
    setWeightKg("");
    setWeightNote("");
    setOtherExams("");
    setLittersCount("");
    setMatingCount("");
    setLittersNote("");
    setBreederName("");
    setBreederCountry("");
    setOwnerName("");
    setOwnerAddress("");
    setOwnerPhone("");
    setOwnerEmail("");
    setOwnerWeb("");
    setPedigreeUrl("");
    setLpn1("");
    setLpn2("");
    setLpn3("");
    setLemp("");
    setHdLeft("");
    setHdRight("");
    setEdLeft("");
    setEdRight("");
    setEditing(null);
    setIsNew(false);
    setGallery([]);
    setAutoDraft(false);
  };

  const isFormEffectivelyEmpty = () => {
    const healthEmpty =
      !lpn1.trim() &&
      !lpn2.trim() &&
      !lpn3.trim() &&
      !lemp.trim() &&
      !hdLeft.trim() &&
      !hdRight.trim() &&
      !edLeft.trim() &&
      !edRight.trim();

    return (
      (name.trim() === "" || name.trim().toLowerCase() === "nový leonberger") &&
      !shortNote.trim() &&
      !note.trim() &&
      !sireName.trim() &&
      !damName.trim() &&
      !birthDate.trim() &&
      !spkp.trim() &&
      !bonitationCode.trim() &&
      !heightCm.trim() &&
      !heightNote.trim() &&
      !weightKg.trim() &&
      !weightNote.trim() &&
      !otherExams.trim() &&
      !littersCount.trim() &&
      !matingCount.trim() &&
      !littersNote.trim() &&
      !breederName.trim() &&
      !ownerName.trim() &&
      !ownerAddress.trim() &&
      !ownerPhone.trim() &&
      !ownerEmail.trim() &&
      !ownerWeb.trim() &&
      !pedigreeUrl.trim() &&
      healthEmpty
    );
  };

  const startNewDraft = async () => {
    try {
      const payload: TablesInsert<"leonbergers"> = {
        name: "Nový leonberger",
        sex: "pes",
        is_veteran: false,
        published: false,
        short_note: null,
        note: null,
        health: {},
        created_by: user?.id || null,
      };

      const { data, error } = await supabase
        .from("leonbergers")
        .insert(payload)
        .select("id, name, sex, is_veteran, published, profile_image_url, health, short_note, note, sire_name, dam_name, birth_date, spkp, bonitation_code, height_cm, height_note, weight_kg, weight_note, other_exams, litters_count, litters_note, mating_count, breeder_name, owner_name, owner_address, owner_phone, owner_email, owner_web, pedigree_url, created_by, created_at, updated_at")
        .single();

      if (error) throw error;

      const row = data as LeonbergerRow;
      setAutoDraft(true);
      startEdit(row);
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err) || "Nepodarilo sa vytvoriť záznam", variant: "destructive" });
    }
  };

  const startEdit = (row: LeonbergerRow) => {
    setName(row.name || "");
    setSlug((row as any).slug || "");
    setSlugTouched(false);
    setSex(row.sex || "pes");
    setIsVeteran(!!row.is_veteran);
    setIsDeceased(!!(row as any).is_deceased);
    setPublished(!!row.published);
    setShortNote(row.short_note || "");
    setNote(row.note || "");
    setSireName(row.sire_name || "");
    setDamName(row.dam_name || "");
    setBirthDate(row.birth_date ? String(row.birth_date).slice(0, 10) : "");
    setSpkp(row.spkp != null ? String(row.spkp) : "");
    setBonitationCode(row.bonitation_code || "");
    setHeightCm(row.height_cm != null ? String(row.height_cm) : "");
    setHeightNote(row.height_note || "");
    setWeightKg(row.weight_kg != null ? String(row.weight_kg) : "");
    setWeightNote(row.weight_note || "");
    setOtherExams(row.other_exams || "");
    setLittersCount(row.litters_count != null ? String(row.litters_count) : "");
    setMatingCount(row.mating_count != null ? String(row.mating_count) : "");
    setLittersNote(row.litters_note || "");
    setBreederName(row.breeder_name || "");
    setBreederCountry((row as any).breeder_country || "");
    setOwnerName(row.owner_name || "");
    setOwnerAddress(row.owner_address || "");
    setOwnerPhone(row.owner_phone || "");
    setOwnerEmail(row.owner_email || "");
    setOwnerWeb(row.owner_web || "");
    setPedigreeUrl(row.pedigree_url || "");

    const h = safeHealth(row.health);
    setLpn1(h.lpn1 || "");
    setLpn2(h.lpn2 || "");
    setLpn3(h.lpn3 || "");
    setLemp(h.lemp || "");
    setHdLeft(h.hd?.left || "");
    setHdRight(h.hd?.right || "");
    setEdLeft(h.ed?.left || "");
    setEdRight(h.ed?.right || "");

    setEditing(row);
    setIsNew(false);

    void fetchGallery(row.id);
  };

  const buildHealth = (): Health => {
    const out: Health = {};
    const a = normalizePair(lpn1);
    const b = normalizePair(lpn2);
    const d = normalizePair(lpn3);
    const c = normalizePair(lemp);
    const hdL = (hdLeft || "").trim();
    const hdR = (hdRight || "").trim();
    const edL = (edLeft || "").trim();
    const edR = (edRight || "").trim();

    if (a) out.lpn1 = a;
    if (b) out.lpn2 = b;
    if (d) out.lpn3 = d;
    if (c) out.lemp = c;
    if (hdL || hdR) out.hd = { left: hdL || undefined, right: hdR || undefined };
    if (edL || edR) out.ed = { left: edL || undefined, right: edR || undefined };
    return out;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Chyba", description: "Vyplňte meno", variant: "destructive" });
      return;
    }

    const baseSlug = slugify(name.trim());
    const chosenSlug = slugify(slug.trim()) || baseSlug;
    const slugCandidate = chosenSlug || `leonberger-${(editing?.id || "").slice(0, 8)}`;

    if (editing) {
      const payload: TablesUpdate<"leonbergers"> = {
        name: name.trim(),
        slug: slugCandidate,
        sex,
        is_veteran: isVeteran,
        is_deceased: isDeceased,
        published,
        short_note: shortNote.trim() || null,
        note: note.trim() || null,
        sire_name: sireName.trim() || null,
        dam_name: damName.trim() || null,
        birth_date: birthDate || null,
        spkp: parseOptionalInt(spkp),
        bonitation_code: bonitationCode.trim() || null,
        height_cm: parseOptionalDecimal(heightCm),
        height_note: heightNote.trim() || null,
        weight_kg: parseOptionalDecimal(weightKg),
        weight_note: weightNote.trim() || null,
        other_exams: otherExams.trim() || null,
        litters_count: sex === "suka" ? parseOptionalInt(littersCount) : null,
        mating_count: sex === "pes" ? parseOptionalInt(matingCount) : null,
        litters_note: littersNote.trim() || null,
        breeder_name: breederName.trim() || null,
        breeder_country: breederCountry.trim() || null,
        owner_name: ownerName.trim() || null,
        owner_address: ownerAddress.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        owner_email: ownerEmail.trim() || null,
        owner_web: ownerWeb.trim() || null,
        pedigree_url: pedigreeUrl.trim() || null,
        health: buildHealth(),
      };
      let { error } = await supabase.from("leonbergers").update(payload).eq("id", editing.id);
      // If slug collides, append a short id suffix and retry once.
      if (error && /slug/i.test(error.message)) {
        const retry: TablesUpdate<"leonbergers"> = { ...payload, slug: `${slugCandidate}-${editing.id.slice(0, 6)}` };
        const res = await supabase.from("leonbergers").update(retry).eq("id", editing.id);
        error = res.error;
      }
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Uložené" });
    } else {
      const payload: TablesInsert<"leonbergers"> = {
        name: name.trim(),
        slug: slugCandidate,
        sex,
        is_veteran: isVeteran,
        is_deceased: isDeceased,
        published,
        short_note: shortNote.trim() || null,
        note: note.trim() || null,
        sire_name: sireName.trim() || null,
        dam_name: damName.trim() || null,
        birth_date: birthDate || null,
        spkp: parseOptionalInt(spkp),
        bonitation_code: bonitationCode.trim() || null,
        height_cm: parseOptionalDecimal(heightCm),
        height_note: heightNote.trim() || null,
        weight_kg: parseOptionalDecimal(weightKg),
        weight_note: weightNote.trim() || null,
        other_exams: otherExams.trim() || null,
        litters_count: sex === "suka" ? parseOptionalInt(littersCount) : null,
        mating_count: sex === "pes" ? parseOptionalInt(matingCount) : null,
        litters_note: littersNote.trim() || null,
        breeder_name: breederName.trim() || null,
        breeder_country: breederCountry.trim() || null,
        owner_name: ownerName.trim() || null,
        owner_address: ownerAddress.trim() || null,
        owner_phone: ownerPhone.trim() || null,
        owner_email: ownerEmail.trim() || null,
        owner_web: ownerWeb.trim() || null,
        pedigree_url: pedigreeUrl.trim() || null,
        health: buildHealth(),
        created_by: user?.id || null,
      };
      let { error } = await supabase.from("leonbergers").insert(payload);
      // If slug collides, retry with random-ish suffix.
      if (error && /slug/i.test(error.message)) {
        const retry: TablesInsert<"leonbergers"> = {
          ...payload,
          slug: `${slugCandidate}-${Math.random().toString(36).slice(2, 8)}`,
        };
        const res = await supabase.from("leonbergers").insert(retry);
        error = res.error;
      }
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Vytvorené" });
    }

    resetForm();
    fetchData();
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!editing?.id || files.length === 0) return;

    try {
      // Find current max sort_order
      const maxOrder = gallery.reduce((m, x) => Math.max(m, x.sort_order), 0);
      let nextOrder = maxOrder + 1;

      for (const file of files) {
        const path = `leonbergers/${editing.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extFromName(file.name)}`;
        const up = await supabase.storage.from("site-assets").upload(path, file);
        if (up.error) throw up.error;

        const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
        const ins = await supabase.from("leonberger_images").insert({
          leonberger_id: editing.id,
          storage_path: path,
          public_url: urlData.publicUrl,
          alt: "",
          sort_order: nextOrder++,
          is_profile: false,
        });
        if (ins.error) throw ins.error;
      }

      toast({ title: "Fotky pridané" });
      await fetchGallery(editing.id);
      const { data: g2 } = await supabase
        .from("leonberger_images")
        .select("id, leonberger_id, storage_path, public_url, alt, sort_order, is_profile, created_at")
        .eq("leonberger_id", editing.id)
        .order("sort_order")
        .order("created_at");
      const next = ((g2 as LeonbergerImageRow[]) || []).map((x, idx) => ({ ...x, sort_order: idx }));
      setGallery(next);
      await syncProfileToFirst(editing.id, next);
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err) || "Nepodarilo sa nahrať fotky", variant: "destructive" });
    } finally {
      if (galleryUploadRef.current) galleryUploadRef.current.value = "";
    }
  };

  const deleteGalleryImage = async (row: LeonbergerImageRow) => {
    if (!editing?.id) return;
    if (!confirm("Zmazať fotku?")) return;
    try {
      const delDb = await supabase.from("leonberger_images").delete().eq("id", row.id);
      if (delDb.error) throw delDb.error;

      const delStorage = await supabase.storage.from("site-assets").remove([row.storage_path]);
      if (delStorage.error) throw delStorage.error;

      toast({ title: "Zmazané" });
      await fetchGallery(editing.id);
      const next = gallery.filter((g) => g.id !== row.id).map((x, idx) => ({ ...x, sort_order: idx }));
      setGallery(next);
      await syncProfileToFirst(editing.id, next);
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err) || "Nepodarilo sa zmazať fotku", variant: "destructive" });
    }
  };

  const onDragEnd = async (event: DragEndEvent) => {
    if (!editing?.id) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = gallery.findIndex((x) => x.id === active.id);
    const newIndex = gallery.findIndex((x) => x.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(gallery, oldIndex, newIndex).map((x, idx) => ({ ...x, sort_order: idx }));
    setGallery(next);

    // Persist orders (small lists; simple batch)
    await Promise.all(
      next.map((x) => supabase.from("leonberger_images").update({ sort_order: x.sort_order }).eq("id", x.id)),
    );

    try {
      await syncProfileToFirst(editing.id, next);
      await fetchData();
    } catch (err: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(err) || "Nepodarilo sa uložiť profilovú fotku", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Zmazať záznam?")) return;
    const { error } = await supabase.from("leonbergers").delete().eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Zmazané" });
    fetchData();
  };

  const togglePublished = async (row: LeonbergerRow, value: boolean) => {
    setListBusy(true);
    try {
      const { error } = await supabase.from("leonbergers").update({ published: value }).eq("id", row.id);
      if (error) throw error;
      setItems((prev) => prev.map((x) => (x.id === row.id ? { ...x, published: value } : x)));
      if (editing?.id === row.id) {
        setPublished(value);
        setEditing((e) => (e ? { ...e, published: value } : null));
      }
    } catch (err: unknown) {
      toast({ title: "Nepodarilo sa zmeniť publikovanie", description: getErrorMessage(err), variant: "destructive" });
    } finally {
      setListBusy(false);
    }
  };

  const showForm = isNew || editing;

  const filtered = useMemo(() => {
    const q = filterName.trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => (x.name || "").toLowerCase().includes(q));
  }, [items, filterName]);

  return (
    <div>
      {!showForm && (
        <Button
          onClick={() => {
            resetForm();
            void startNewDraft();
          }}
          className="mb-4"
        >
          <Plus className="w-4 h-4 mr-1" /> Nový leonberger
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border p-4 mb-4">
          <h3 className="font-heading text-lg font-bold mb-3">
            {editing ? "Upraviť leonberger" : "Nový leonberger"}
          </h3>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <Label>Meno</Label>
              <Input
                value={name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setName(nextName);
                  if (!slugTouched) {
                    setSlug(slugify(nextName));
                  }
                }}
              />
            </div>
            <div>
              <Label>Pohlavie</Label>
              <select
                className="w-full border border-border bg-background px-3 py-2 text-sm"
                value={sex}
                onChange={(e) => setSex(e.target.value as "pes" | "suka")}
              >
                <option value="pes">Pes</option>
                <option value="suka">Suka</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <Label>Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="napr. arwen-z-udolia"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <Label>Krátka poznámka</Label>
              <Input value={shortNote} onChange={(e) => setShortNote(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <Switch checked={isDeceased} onCheckedChange={setIsDeceased} />
              <Label>† Zomrel (nezobraziť v zoznamoch)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isVeteran} onCheckedChange={setIsVeteran} />
              <Label>Veterán</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={published} onCheckedChange={setPublished} />
              <Label>Publikované</Label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2">
              <Label>Chovateľ</Label>
              <Input value={breederName} onChange={(e) => setBreederName(e.target.value)} />
            </div>
            <div>
              <Label>Štát (chovateľ)</Label>
              <Input value={breederCountry} onChange={(e) => setBreederCountry(e.target.value)} placeholder="napr. SK" />
            </div>
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <h4 className="font-heading font-bold mb-2">Galéria fotiek</h4>

            {!editing ? null : (
              <>
                <div className="flex items-end gap-3 mb-3">
                  <div>
                    <Label>Pridať fotky</Label>
                    <Input
                      ref={galleryUploadRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                    />
                  </div>
                </div>

                {gallery.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Zatiaľ nemáš pridané žiadne fotky.</p>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={gallery.map((g) => g.id)} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {gallery.map((g, idx) => (
                          <GalleryItem key={g.id} row={g} isFirst={idx === 0} onDelete={deleteGalleryImage} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </>
            )}
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <h4 className="font-heading font-bold mb-2">Základné údaje</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Otec</Label>
                <Input value={sireName} onChange={(e) => setSireName(e.target.value)} />
              </div>
              <div>
                <Label>Matka</Label>
                <Input value={damName} onChange={(e) => setDamName(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>Narodený</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div>
                <Label>SPKP</Label>
                <Input value={spkp} onChange={(e) => setSpkp(e.target.value)} />
              </div>
              <div>
                <Label>Bonitačný kód</Label>
                <Input value={bonitationCode} onChange={(e) => setBonitationCode(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label>Výška (cm)</Label>
                <Input
                  inputMode="decimal"
                  step="any"
                  placeholder="napr. 75 alebo 75,5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                />
              </div>
              <div>
                <Label>Váha (kg)</Label>
                <Input
                  inputMode="decimal"
                  step="any"
                  placeholder="napr. 55 alebo 55,2"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label>Poznámka k výške (napr. 28 mesiacov)</Label>
                <Input
                  value={heightNote}
                  onChange={(e) => setHeightNote(e.target.value)}
                  placeholder="napr. 28 mesiacov"
                />
              </div>
              <div>
                <Label>Poznámka k váhe (napr. 28 mesiacov)</Label>
                <Input
                  value={weightNote}
                  onChange={(e) => setWeightNote(e.target.value)}
                  placeholder="napr. 28 mesiacov"
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>URL rodokmeňa (PDF alebo web)</Label>
              <Input
                value={pedigreeUrl}
                onChange={(e) => setPedigreeUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="mt-3">
              <Label>Poznámka</Label>
              <TiptapEditor content={note} onChange={setNote} key={editing?.id || "new-leonberger-note"} />
            </div>
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <h4 className="font-heading font-bold mb-2">Zdravie / testy</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>LPN1</Label>
                <Input value={lpn1} onChange={(e) => setLpn1(e.target.value)} />
              </div>
              <div>
                <Label>LPN2</Label>
                <Input value={lpn2} onChange={(e) => setLpn2(e.target.value)} />
              </div>
              <div>
                <Label>LPN3</Label>
                <Input value={lpn3} onChange={(e) => setLpn3(e.target.value)} />
              </div>
              <div>
                <Label>LEMP</Label>
                <Input value={lemp} onChange={(e) => setLemp(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="border border-border bg-background p-3">
                <h5 className="font-heading font-bold mb-2">DBK/HD</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ľavá</Label>
                    <Input value={hdLeft} onChange={(e) => setHdLeft(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pravá</Label>
                    <Input value={hdRight} onChange={(e) => setHdRight(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border border-border bg-background p-3">
                <h5 className="font-heading font-bold mb-2">DLK/ED</h5>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ľavá</Label>
                    <Input value={edLeft} onChange={(e) => setEdLeft(e.target.value)} />
                  </div>
                  <div>
                    <Label>Pravá</Label>
                    <Input value={edRight} onChange={(e) => setEdRight(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Pozn.: hodnoty sa ukladajú do `health` (JSON) — LPN1/2/3, LEMP, HD/ED.
            </p>
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <h4 className="font-heading font-bold mb-2">Ďalšie</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ďalšie vyšetrenia</Label>
                <Input value={otherExams} onChange={(e) => setOtherExams(e.target.value)} />
              </div>
              <div>
                <Label>"Počet vrhov"</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={sex === "suka" ? littersCount : matingCount}
                  onChange={(e) =>
                    sex === "suka" ? setLittersCount(e.target.value) : setMatingCount(e.target.value)
                  }
                />
              </div>
            </div>
            <div className="mt-3">
              <Label>Vrhy (poznámka)</Label>
              <Input value={littersNote} onChange={(e) => setLittersNote(e.target.value)} />
            </div>
          </div>

          <div className="bg-muted/50 border border-border p-3 mb-3">
            <h4 className="font-heading font-bold mb-2">Kontaktné údaje</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Chovateľ</Label>
                <Input value={breederName} onChange={(e) => setBreederName(e.target.value)} />
              </div>
              <div>
                <Label>Majiteľ</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <Label>Adresa</Label>
              <Input value={ownerAddress} onChange={(e) => setOwnerAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <Label>Telefón/fax</Label>
                <Input value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} />
              </div>
              <div>
                <Label>e-mail</Label>
                <Input value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </div>
              <div>
                <Label>web</Label>
                <Input value={ownerWeb} onChange={(e) => setOwnerWeb(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave}>{editing ? "Uložiť" : "Vytvoriť"}</Button>
            <Button
              variant="outline"
              onClick={async () => {
                const currentId = editing?.id;
                const shouldCleanup = autoDraft && currentId && gallery.length === 0 && isFormEffectivelyEmpty();

                resetForm();

                if (shouldCleanup) {
                  await supabase.from("leonbergers").delete().eq("id", currentId);
                  toast({ title: "Zrušené", description: "Prázdny záznam bol odstránený." });
                  fetchData();
                }
              }}
            >
              Zrušiť
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="w-72"
          />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1 py-6 text-center border border-border bg-card">Žiadne záznamy.</p>
        ) : (
          filtered.map((row) => (
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
                <div className="font-semibold break-words">{row.name}</div>
                <div className="text-sm text-muted-foreground break-words mt-0.5">
                  {[row.short_note, row.sex === "pes" ? "Pes" : "Suka", row.is_veteran ? "Veterán" : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
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
                <Button variant="outline" size="sm" onClick={() => startEdit(row)} disabled={listBusy} title="Upraviť">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(row.id)} disabled={listBusy} title="Zmazať">
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

export default LeonbergersManager;

