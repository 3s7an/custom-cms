import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import StructuredData from "@/components/StructuredData";
import { useOrganizationSchema } from "@/hooks/useOrganizationSchema";
import {
  buildBreadcrumbList,
  buildLeonbergerAnimal,
  buildProfilePage,
  stripHtml,
  toJsonLdGraph,
} from "@/lib/structuredData";
import { supabase } from "@/integrations/supabase/client";
import PublicPageShell from "@/components/PublicPageShell";
import NotFoundContent from "@/components/NotFoundContent";
import LeonbergerGallery from "@/components/leonberger/LeonbergerGallery";
import { Button } from "@/components/ui/button";
import { useSiteIdentity } from "@/context/siteIdentity";
import {
  formatDateSk,
  formatHeightCm,
  formatWeightKg,
  healthStripItems,
  toAbsoluteHttpUrl,
} from "@/lib/leonbergerDisplay";
import { MapPin, Phone, ExternalLink, Mail, Globe } from "lucide-react";

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

function parseOtherExams(otherExams: string | null): Array<{ label: string; value: string }> {
  const raw = (otherExams || "").trim();
  if (!raw) return [];

  const parts = raw
    .split(/\r?\n|;+/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: Array<{ label: string; value: string }> = [];
  for (const p of parts) {
    // Accept formats like "ABC: 1/1" or "ABC - 1/1"
    const m = p.match(/^(.+?)(?:\s*[:\-]\s*)(.+)$/);
    if (m) {
      const label = m[1].trim();
      const value = m[2].trim();
      if (label && value) out.push({ label, value });
    } else {
      // Fallback: treat the whole line as label with empty value (skip)
    }
  }
  return out;
}

type DetailRow = {
  id: string;
  name: string;
  sex: "pes" | "suka";
  is_veteran: boolean;
  profile_image_url: string | null;
  pedigree_url: string | null;
  note: string | null;
  short_note: string | null;
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
  mating_count: number | null;
  litters_note: string | null;
  breeder_name: string | null;
  breeder_country: string | null;
  owner_name: string | null;
  owner_address: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  owner_web: string | null;
  health: unknown;
};

type ImageRow = { id: string; public_url: string; alt: string | null; sort_order: number };

const AttrRow = ({ label, value }: { label: string; value: string | null }) => {
  if (!value?.trim()) return null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-dashed border-border/80 py-2 text-sm sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 font-semibold sm:min-w-[7.5rem]">{label}</span>
      <span className="min-w-0 flex-1 break-words text-foreground">{value}</span>
    </div>
  );
};

const LeonbergerDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { identity } = useSiteIdentity();
  const { organization, website, orgName } = useOrganizationSchema();
  const [row, setRow] = useState<DetailRow | null>(undefined);
  const [gallery, setGallery] = useState<ImageRow[]>([]);

  useEffect(() => {
    if (!slug?.trim()) { setRow(null); return; }

    const run = async () => {
      const { data, error } = await supabase
        .from("leonbergers")
        .select(
          "id, name, sex, is_veteran, profile_image_url, pedigree_url, note, short_note, sire_name, dam_name, birth_date, spkp, bonitation_code, height_cm, height_note, weight_kg, weight_note, other_exams, litters_count, mating_count, litters_note, breeder_name, breeder_country, owner_name, owner_address, owner_phone, owner_email, owner_web, health",
        )
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

      if (error || !data) {
        setRow(null);
        return;
      }
      setRow(data as DetailRow);

      const leonbergerId = (data as DetailRow).id;
      const { data: imgs } = await supabase
        .from("leonberger_images")
        .select("id, public_url, alt, sort_order")
        .eq("leonberger_id", leonbergerId)
        .order("sort_order")
        .order("created_at");
      setGallery((imgs as ImageRow[]) || []);
    };
    void run();
  }, [slug]);

  useEffect(() => {
    if (row === undefined) return;
    if (!row) {
      document.title = identity?.siteTitle || "Leonberger";
      return;
    }
    document.title = `${row.name} | ${identity?.siteTitle || "Leonberger"}`.trim();
  }, [row, identity?.siteTitle]);

  const structuredData = useMemo(() => {
    if (!row || !slug) return null;
    const path = `/leonberger/${slug}`;
    const description =
      row.short_note?.trim() ||
      (row.note?.trim() ? stripHtml(row.note).slice(0, 300) : undefined);
    const animal = buildLeonbergerAnimal({
      path,
      name: row.name,
      description,
      image: row.profile_image_url,
      birthDate: row.birth_date,
      sex: row.sex,
      sireName: row.sire_name,
      damName: row.dam_name,
    });
    const profilePage = buildProfilePage({ path, name: row.name, description });
    const breadcrumb = buildBreadcrumbList([
      { name: orgName, path: "/" },
      { name: row.name, path },
    ]);
    return toJsonLdGraph(organization, website, animal, profilePage, breadcrumb);
  }, [row, slug, organization, website, orgName]);

  if (row === undefined) {
    return (
      <PublicPageShell>
        <p className="text-muted-foreground">Načítavam…</p>
      </PublicPageShell>
    );
  }

  if (!row) {
    return (
      <PublicPageShell mainClassName="p-6">
        <NotFoundContent />
      </PublicPageShell>
    );
  }

  const birth = formatDateSk(row.birth_date);
  const h = formatHeightCm(row.height_cm);
  const w = formatWeightKg(row.weight_kg);
  const heightWithNote =
    h && row.height_note?.trim()
      ? `${h} ${row.height_note.includes("(") ? row.height_note.trim() : `(${row.height_note.trim()})`}`
      : h;
  const weightWithNote =
    w && row.weight_note?.trim()
      ? `${w} ${row.weight_note.includes("(") ? row.weight_note.trim() : `(${row.weight_note.trim()})`}`
      : w;
  const healthItems = healthStripItems(row.health);
  const otherExamsText = (row.other_exams || "").trim();

  const ownerWeb = toAbsoluteHttpUrl(row.owner_web);
  const pedigreeHref = toAbsoluteHttpUrl(row.pedigree_url);

  return (
    <PublicPageShell>
      <StructuredData data={structuredData} />
      <article className="w-full min-w-0 max-w-full">
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="order-2 mx-auto w-full min-w-0 max-w-md space-y-4 lg:order-none lg:col-span-5 lg:mx-0 lg:max-w-none xl:col-span-4">
            <div className="aspect-[4/3] bg-slk-cream border border-border overflow-hidden">
              {row.profile_image_url ? (
                <img
                  src={row.profile_image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  Bez fotky
                </div>
              )}
            </div>
            {pedigreeHref ? (
              <Button
                asChild
                className="w-full font-heading font-bold uppercase bg-slk-brown text-[#fff7e3] hover:bg-slk-brown-dark"
              >
                <a href={pedigreeHref} target="_blank" rel="noopener noreferrer">
                  Rodokmeň
                  <ExternalLink className="w-4 h-4 ml-2 inline" aria-hidden />
                </a>
              </Button>
            ) : null}
            {row.note?.trim() ? (
              looksLikeHtml(row.note) ? (
                <div className="border border-border bg-background p-3 text-sm overflow-x-auto">
                  <div
                    className="slk-rich"
                    dangerouslySetInnerHTML={{ __html: row.note.trim() }}
                  />
                </div>
              ) : (
                <div className="border border-border bg-background p-3 text-sm whitespace-pre-line">
                  {row.note.trim()}
                </div>
              )
            ) : null}
          </div>

          <div className="order-1 min-w-0 max-w-full lg:order-none lg:col-span-7 xl:col-span-8">
            <h1 className="mb-4 break-words font-heading text-2xl font-bold leading-tight md:text-3xl">
              {row.name}
            </h1>
            <p className="mb-4 text-sm text-muted-foreground">
              {row.sex === "pes" ? "Pes" : "Sučka"}
              {row.is_veteran ? " · veterán" : ""}
            </p>

            {row.short_note?.trim() ? (
              <p className="mb-4 min-w-0 break-words whitespace-pre-line text-foreground">{row.short_note.trim()}</p>
            ) : null}

            <div className="mb-4 min-w-0 max-w-full">
              <AttrRow label="Otec" value={row.sire_name?.trim() || null} />
              <AttrRow label="Matka" value={row.dam_name?.trim() || null} />
              <AttrRow label="Dátum narodenia" value={birth} />
              <AttrRow label="SPKP" value={row.spkp != null ? String(row.spkp) : null} />
              <AttrRow label="Výška" value={heightWithNote} />
              <AttrRow label="Váha" value={weightWithNote} />
              <AttrRow
                label="Vrhy"
                value={
                  (() => {
                    const n = row.sex === "suka" ? row.litters_count : row.mating_count;
                    const parts: string[] = [];
                    if (n != null) parts.push(String(n));
                    if (row.litters_note?.trim()) parts.push(row.litters_note.trim());
                    return parts.length ? parts.join(" · ") : null;
                  })()
                }
              />
            </div>

            {healthItems.length > 0 || Boolean(otherExamsText) ? (
              <div className="mt-4 min-w-0 max-w-full border border-border bg-background p-4">
                <p className="mb-3 text-center font-heading text-sm font-semibold">Zdravotné výsledky</p>
                <div className="flex min-w-0 flex-col items-center gap-3">
                  <div className="grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center md:gap-x-6 md:gap-y-4">
                    {healthItems.map((item) => (
                      <div
                        key={item.id}
                        className="min-w-0 px-0.5 text-center md:w-28 md:max-w-[9rem] md:shrink-0"
                      >
                        <div className="text-xs font-semibold leading-tight">{item.label}</div>
                        <div className="mt-0.5 break-words text-sm font-bold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {otherExamsText ? (
                    <div className="w-full min-w-0 max-w-full pt-2 text-center">
                      <div className="mb-1 font-heading text-sm font-semibold">Ďalšie vyšetrenia</div>
                      <div className="min-w-0 break-words text-sm whitespace-pre-wrap">{otherExamsText}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="order-3 mt-2 w-full min-w-0 max-w-full border-t border-border pt-6 lg:order-none lg:col-span-12 lg:mt-0 lg:pt-8">
            <div className="space-y-4 w-full max-w-none">
              <div className="bg-muted/60 border border-border p-5 sm:p-6 relative overflow-hidden w-full">
                <div className="max-w-5xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-6 md:gap-8 items-start">
                  <div className="text-left min-w-0 w-full">
                    <h2 className="font-heading text-lg font-bold mb-2 md:mb-3">Majiteľ</h2>
                    {row.owner_name?.trim() ? (
                      <p className="font-semibold text-balance">{row.owner_name.trim()}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Neuvedené</p>
                    )}
                  </div>
                  <div className="text-left space-y-3 min-w-0 w-full">
                    {row.owner_address?.trim() ? (
                      <p className="text-sm flex gap-3 justify-start items-start">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slk-brown" aria-hidden />
                        <span className="min-w-0 leading-relaxed">{row.owner_address.trim()}</span>
                      </p>
                    ) : null}
                    {row.owner_phone?.trim() ? (
                      <p className="text-sm flex gap-3 justify-start items-start">
                        <Phone className="w-4 h-4 shrink-0 mt-0.5 text-slk-brown" aria-hidden />
                        <a
                          href={`tel:${row.owner_phone.replace(/\s/g, "")}`}
                          className="text-accent underline min-w-0 break-words"
                        >
                          {row.owner_phone.trim()}
                        </a>
                      </p>
                    ) : null}
                    {row.owner_email?.trim() ? (
                      <p className="text-sm flex gap-3 justify-start items-start">
                        <Mail className="w-4 h-4 shrink-0 mt-0.5 text-slk-brown" aria-hidden />
                        <a
                          href={`mailto:${row.owner_email.trim()}`}
                          className="text-accent underline min-w-0 break-words"
                        >
                          {row.owner_email.trim()}
                        </a>
                      </p>
                    ) : null}
                    {ownerWeb ? (
                      <p className="text-sm flex gap-3 justify-start items-start">
                        <Globe className="w-4 h-4 shrink-0 mt-0.5 text-slk-brown" aria-hidden />
                        <a
                          href={ownerWeb}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent underline min-w-0 break-words"
                        >
                          {row.owner_web?.trim()}
                        </a>
                      </p>
                    ) : null}
                  </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-[0.06] bg-[radial-gradient(circle,rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[length:12px_12px]" />
              </div>

            </div>
          </div>
        </div>

        <div className="mt-4 bg-muted/60 border border-border p-5 sm:p-6 relative overflow-hidden w-full max-w-none">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-6 md:gap-8 items-start">
              <div className="text-left min-w-0 w-full">
                <h2 className="font-heading text-lg font-bold mb-2 md:mb-3">Chovateľ</h2>
                {row.breeder_name?.trim() ? (
                  <p className="font-semibold text-balance">{row.breeder_name.trim()}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Neuvedené</p>
                )}
              </div>
              <div className="text-left space-y-3 min-w-0 w-full">
                <p className="text-sm flex gap-3 justify-start items-start">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slk-brown" aria-hidden />
                  <span className="min-w-0 leading-relaxed">
                    {row.breeder_country?.trim() || "—"}
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 opacity-[0.06] bg-[radial-gradient(circle,rgba(0,0,0,0.15)_1px,transparent_1px)] bg-[length:12px_12px]" />
        </div>

        <LeonbergerGallery key={row.id} images={gallery} />
      </article>
    </PublicPageShell>
  );
};

export default LeonbergerDetail;
