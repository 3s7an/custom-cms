import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";

type SheetRow = Tables<"mating_sheets">;
type SireRow = Tables<"mating_sheet_sires">;
type PuppyRow = Tables<"mating_sheet_puppies">;
type LeonbergerMini = { id: string; slug: string | null; name: string };

type Props = {
  showHeading?: boolean;
  introHtml?: string | null;
  section?: "planned" | "current" | "overview";
};

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

const OUTCOME_LABEL: Record<Enums<"mating_outcome">, string> = {
  unknown: "Vydaný",
  born: "Narodené",
  not_pregnant: "Nakryté",
  lost: "Nakryté",
};

function formatDateSk(dateStr: string | null) {
  const raw = (dateStr || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("sk-SK", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function spkpLabel(n: number | null) {
  if (n == null) return null;
  const s = String(n).padStart(4, "0");
  return `SPKP ${s}`;
}

const RowLine = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="border-b border-dashed border-border/80 last:border-0 py-1.5 text-sm">
    <span className="font-semibold text-foreground">{label}:</span>{" "}
    <span className="text-foreground">{children}</span>
  </div>
);

const MatingSheetsContent = ({ showHeading = true, introHtml, section = "planned" }: Props) => {
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [sires, setSires] = useState<SireRow[]>([]);
  const [puppies, setPuppies] = useState<PuppyRow[]>([]);
  const [leonbergers, setLeonbergers] = useState<LeonbergerMini[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const currentYear = new Date().getFullYear();
  const [plannedYear, setPlannedYear] = useState<number>(currentYear);

  useEffect(() => {
    // When switching between FE subpages, start at first page.
    setPage(1);
  }, [section]);

  useEffect(() => {
    const run = async () => {
      const sheetsRes = await supabase
        .from("mating_sheets")
        .select("*")
        .eq("published", true)
        .order("sheet_year", { ascending: false })
        .order("sheet_number", { ascending: false })
        .order("created_at", { ascending: false });

      const rows = (sheetsRes.data as SheetRow[]) || [];
      setSheets(rows);
      setPage(1);
      setPlannedYear(currentYear);

      if (rows.length === 0) {
        setSires([]);
        setPuppies([]);
        setLeonbergers([]);
        return;
      }

      const ids = rows.map((x) => x.id);
      const damIds = Array.from(
        new Set(rows.map((x) => x.dam_leonberger_id).filter((x): x is string => !!x)),
      );

      const [siresRes, pupsRes] = await Promise.all([
        supabase
          .from("mating_sheet_sires")
          .select("*")
          .in("sheet_id", ids)
          .order("sort_order")
          .order("created_at"),
        supabase
          .from("mating_sheet_puppies")
          .select("*")
          .in("sheet_id", ids)
          .order("sort_order")
          .order("created_at"),
      ]);

      setSires((siresRes.data as SireRow[]) || []);
      setPuppies((pupsRes.data as PuppyRow[]) || []);

      if (damIds.length > 0) {
        const leosRes = await supabase.from("leonbergers").select("id, slug, name").in("id", damIds);
        setLeonbergers((leosRes.data as LeonbergerMini[]) || []);
      } else {
        setLeonbergers([]);
      }
    };

    void run();
  }, []);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(sheets.map((s) => s.sheet_year).filter((y) => typeof y === "number")));
    years.sort((a, b) => b - a);
    return years.length > 0 ? years : [currentYear];
  }, [currentYear, sheets]);

  const filteredSheets = useMemo(() => {
    return sheets.filter((s) => {
      const preg = !!(s as any).pregnancy_confirmed;
      const isBorn = s.outcome === "born";
      const isCurrentOrBorn = isBorn || preg;

      if (section === "current") {
        // Current year only; show born OR pregnancy confirmed.
        return s.sheet_year === currentYear && isCurrentOrBorn;
      }

      if (section === "overview") {
        // History: previous years; show realized litters (born) and confirmed pregnancies.
        return s.sheet_year <= currentYear - 1 && isCurrentOrBorn;
      }

      // planned: current year by default, but allow browsing by year.
      // Show issued sheets where nothing is (yet) current (no born, no confirmed pregnancy).
      const targetYear = plannedYear || currentYear;
      return s.sheet_year === targetYear && !isCurrentOrBorn;
    });
  }, [currentYear, plannedYear, section, sheets]);

  useEffect(() => {
    // If filters reduce results, keep pagination in range.
    setPage(1);
  }, [plannedYear]);

  const totalPages = Math.max(1, Math.ceil(filteredSheets.length / pageSize));
  const pagedSheets = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredSheets.slice(start, start + pageSize);
  }, [filteredSheets, page, totalPages]);

  const siresBySheet = useMemo(() => {
    const map = new Map<string, SireRow[]>();
    for (const s of sires) {
      const arr = map.get(s.sheet_id) || [];
      arr.push(s);
      map.set(s.sheet_id, arr);
    }
    return map;
  }, [sires]);

  const puppiesBySheet = useMemo(() => {
    const map = new Map<string, PuppyRow[]>();
    for (const p of puppies) {
      const arr = map.get(p.sheet_id) || [];
      arr.push(p);
      map.set(p.sheet_id, arr);
    }
    return map;
  }, [puppies]);

  const damNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leonbergers) m.set(l.id, l.name);
    return m;
  }, [leonbergers]);

  const damSlugById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of leonbergers) {
      if (l.slug?.trim()) m.set(l.id, l.slug.trim());
    }
    return m;
  }, [leonbergers]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="px-4 py-4">
      {showHeading ? (
        <h1 className="font-heading text-2xl font-bold text-foreground mb-6">Krycie listy</h1>
      ) : null}

      {introHtml?.trim() ? (
        looksLikeHtml(introHtml) ? (
          <div className="overflow-x-auto mb-6">
            <div className="slk-rich" dangerouslySetInnerHTML={{ __html: introHtml }} />
          </div>
        ) : (
          <div className="whitespace-pre-line text-foreground mb-6">{introHtml}</div>
        )
      ) : null}

      {filteredSheets.length === 0 ? <p className="text-muted-foreground">Žiadne krycie listy.</p> : null}

      {section === "planned" ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            Rok:
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border border-border bg-background px-3 py-2 text-sm"
              value={plannedYear}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPlannedYear(Number.isFinite(next) ? next : currentYear);
                setPage(1);
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground">
              (Krytia a plánované vrhy)
            </div>
          </div>
        </div>
      ) : null}

      {filteredSheets.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 mb-4 text-sm">
          <div className="text-muted-foreground">
            Strana {page} / {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Predchádzajúca
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Ďalšia
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {pagedSheets.map((s) => {
          const sheetSires = siresBySheet.get(s.id) || [];
          const used = sheetSires.find((x) => x.is_used) || null;
          const sheetPups = puppiesBySheet.get(s.id) || [];
          const males = sheetPups.filter((p) => p.sex === "pes").length;
          const females = sheetPups.filter((p) => p.sex === "suka").length;
          const isExpanded = !!expanded[s.id];

          const usedLabel = used
            ? `${used.sire_name}${used.country?.trim() ? ` (${used.country.trim()})` : ""}`
            : null;

          return (
            <article
              key={s.id}
              className="border border-border bg-[#f2eee6] bg-[length:4px_4px] bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)] flex flex-col"
            >
              <div className="p-3 sm:p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:border-0 sm:pb-0">
                  <div className="min-w-0 w-full sm:flex-1">
                    <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight">
                      Krycí list {s.sheet_number}/{s.sheet_year}
                    </h2>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 sm:max-w-[min(100%,22rem)] md:max-w-none">
                    <div className="flex flex-wrap gap-1.5 sm:contents">
                      {(() => {
                        const label = OUTCOME_LABEL[s.outcome];
                        return (
                          <span className="inline-flex items-center rounded-sm border border-border bg-slk-brown px-2 py-1 text-xs font-medium leading-snug text-slk-cream">
                            {label}
                          </span>
                        );
                      })()}
                      {!!(s as any).pregnancy_confirmed ? (
                        <span className="inline-flex items-center rounded-sm border border-border bg-slk-brown px-2 py-1 text-xs font-medium leading-snug text-slk-cream">
                          Potvrdená gravidita
                        </span>
                      ) : null}
                      {s.litter_check_done ? (
                        <span className="inline-flex max-w-full items-center rounded-sm border border-border bg-slk-brown px-2 py-1 text-xs font-medium leading-snug text-slk-cream break-words">
                          Kontrola vrhu{s.litter_check_date ? ` · ${formatDateSk(s.litter_check_date)}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto min-h-11 w-full shrink-0 justify-between gap-3 rounded-sm border border-border bg-[#fff7e3] px-3 py-2.5 text-sm font-medium text-accent hover:!bg-[#fff7e3] hover:!text-accent focus:!bg-[#fff7e3] focus:!text-accent focus-visible:!bg-[#fff7e3] focus-visible:!text-accent active:!bg-[#fff7e3] active:!text-accent sm:min-h-9 sm:w-auto sm:justify-center sm:px-3 sm:py-2"
                      onClick={() => toggle(s.id)}
                    >
                      <span className="text-left underline underline-offset-2 sm:text-center">
                        {isExpanded ? "Skryť detaily" : "Zobraziť viac"}
                      </span>
                      <ChevronDown
                        className={`size-4 shrink-0 text-accent opacity-80 transition-transform duration-200 sm:hidden ${isExpanded ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="border border-border bg-[#fff7e3] p-3">
                    <RowLine label="Registrovaný chov">{s.kennel_name}</RowLine>
                  </div>
                  <div className="border border-border bg-[#fff7e3] p-3">
                    <RowLine label="Meno chovateľa">{s.breeder_name}</RowLine>
                  </div>
                </div>
              </div>

              {isExpanded ? (
                <>
                  <div className="border-t border-border p-3 sm:p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="border border-border bg-[#fff7e3] p-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Rodičia
                        </div>
                        <RowLine label="Matka">
                          {s.dam_leonberger_id ? (
                            <Link
                              to={`/leonberger/${damSlugById.get(s.dam_leonberger_id) || s.dam_leonberger_id}`}
                              className="text-accent underline break-words"
                            >
                              {damNameById.get(s.dam_leonberger_id) || "Zobraziť kartu suky"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </RowLine>

                        <div className="mt-3">
                          <RowLine label="Otec">
                            {used ? (
                              used.external_url?.trim() ? (
                                <a
                                  href={used.external_url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-accent underline break-words"
                                >
                                  {usedLabel}
                                </a>
                              ) : (
                                <span className="break-words">{usedLabel}</span>
                              )
                            ) : (
                              "—"
                            )}
                          </RowLine>
                        </div>
                      </div>

                      <div className="border border-border bg-[#fff7e3] p-3">
                        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                          Dátumy
                        </div>
                        <RowLine label="Vydaný KL">{formatDateSk(s.issue_date)}</RowLine>
                        <RowLine label="Krytie">{formatDateSk(s.mating_date)}</RowLine>
                        <RowLine label="Narodenie">{formatDateSk(s.outcome_date)}</RowLine>
                        <RowLine label="Kontrola vrhu">{formatDateSk(s.litter_check_date)}</RowLine>
                      </div>
                    </div>
                  </div>
                  {sheetPups.length > 0 ? (
                    <div className="border-t border-border p-3 sm:p-4">
                      <div className="border border-border bg-[#fff7e3]">
                        <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-3">
                          <div className="font-semibold text-sm text-foreground">Šteniatka</div>
                          <div className="flex flex-wrap justify-end gap-2">
                            <span className="text-xs px-2 py-1 border border-border bg-slk-cream text-foreground">
                              Spolu: {sheetPups.length}
                            </span>
                            <span className="text-xs px-2 py-1 border border-border bg-slk-cream text-foreground">
                              Psy: {males}
                            </span>
                            <span className="text-xs px-2 py-1 border border-border bg-slk-cream text-foreground">
                              Sučky: {females}
                            </span>
                          </div>
                        </div>
                        {sheetPups.map((p, idx) => (
                          <div key={p.id} className={idx === 0 ? "p-3" : "p-3 border-t border-border/60"}>
                            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                              {p.photo_url ? (
                                <div className="w-full sm:w-[160px] aspect-[4/3] bg-slk-cream border border-border overflow-hidden">
                                  <a href={p.photo_url} target="_blank" rel="noopener noreferrer" title="Otvoriť fotku v plnej veľkosti">
                                    <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                                  </a>
                                </div>
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <div className="font-heading font-semibold">
                                  {(p as any).external_url?.trim() ? (
                                    <a
                                      href={(p as any).external_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-accent underline break-words"
                                    >
                                      {p.name}
                                    </a>
                                  ) : (
                                    p.name
                                  )}
                                  {p.kennel_name?.trim() ? (
                                    <span className="font-normal">{" "}{p.kennel_name.trim()}</span>
                                  ) : null}
                                  {" "}– {p.sex === "pes" ? "pes" : "suka"}
                                  {spkpLabel(p.spkp_number) ? (
                                    <span className="font-normal">{" "}– {spkpLabel(p.spkp_number)}</span>
                                  ) : null}
                                </div>
                                {p.exterior_note?.trim() ? (
                                  <p className="text-sm mt-2 text-foreground whitespace-pre-line">{p.exterior_note.trim()}</p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default MatingSheetsContent;
