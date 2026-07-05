import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { toAbsoluteHttpUrl } from "@/lib/leonbergerDisplay";

type KennelRow = Tables<"kennels">;

type Props = {
  showHeading?: boolean;
  introHtml?: string | null;
};

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

function getErrorMessage(err: unknown) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return "Neznáma chyba";
}

const RowLine = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="border-b border-dashed border-border/80 last:border-0 py-2 text-sm flex flex-col sm:flex-row sm:gap-2">
    <span className="font-semibold shrink-0 min-w-[140px]">{label}</span>
    <span className="text-foreground break-words">{children}</span>
  </div>
);

const KennelsContent = ({ showHeading = true, introHtml }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<KennelRow[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("kennels")
        .select("id, kennel_name, breeder_name, city, address, phone, email, website, published, created_at, updated_at")
        .eq("published", true)
        .order("kennel_name", { ascending: true });
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

  const normalizedRows = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      websiteAbs: toAbsoluteHttpUrl(r.website),
      phoneT: (r.phone || "").trim() || null,
      emailT: (r.email || "").trim() || null,
      cityT: (r.city || "").trim() || null,
      addressT: (r.address || "").trim() || null,
      breederT: (r.breeder_name || "").trim() || null,
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      {showHeading ? (
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">Chovateľské stanice</h2>
      ) : null}

      {introHtml?.trim() ? (
        looksLikeHtml(introHtml) ? (
          <div className="overflow-x-auto">
            <div className="slk-rich" dangerouslySetInnerHTML={{ __html: introHtml }} />
          </div>
        ) : (
          <div className="whitespace-pre-line text-foreground">{introHtml}</div>
        )
      ) : null}

      <div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Načítavam...</p>
        ) : normalizedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Zatiaľ tu nie sú žiadne záznamy.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {normalizedRows.map((r) => (
              <article
                key={r.id}
                className="border border-border bg-[#f2eee6] bg-[length:4px_4px] bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)] flex flex-col"
              >
                <div className="p-3 sm:p-4">
                  <div className="border border-border bg-[#fff7e3] p-4">
                    <div className="font-heading text-lg sm:text-xl font-bold text-foreground break-words">
                      {r.kennel_name}
                    </div>

                    <div className="mt-3">
                      {r.breederT ? <RowLine label="Chovateľ">{r.breederT}</RowLine> : null}
                      {r.cityT ? <RowLine label="Mesto">{r.cityT}</RowLine> : null}
                      {r.addressT ? <RowLine label="Adresa">{r.addressT}</RowLine> : null}
                      {r.phoneT ? <RowLine label="Mobil">{r.phoneT}</RowLine> : null}
                      {r.emailT ? (
                        <RowLine label="E-mail">
                          <a className="text-accent underline break-words" href={`mailto:${r.emailT}`}>
                            {r.emailT}
                          </a>
                        </RowLine>
                      ) : null}
                      {r.websiteAbs ? (
                        <RowLine label="Web">
                          <a
                            className="text-accent underline break-words"
                            href={r.websiteAbs}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            {r.websiteAbs.replace(/^https?:\/\//i, "")}
                          </a>
                        </RowLine>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KennelsContent;

