import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Mail, Phone } from "lucide-react";

type ContactRow = Pick<
  Tables<"contacts">,
  "id" | "position_title" | "name" | "photo_url" | "email" | "phone" | "sort_order" | "published"
>;

type Props = {
  showHeading?: boolean;
  introHtml?: string | null;
};

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

const ContactsContent = ({ showHeading = true, introHtml }: Props) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ContactRow[]>([]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contacts")
        .select("id, position_title, name, photo_url, email, phone, sort_order, published")
        .eq("published", true)
        .order("sort_order")
        .order("created_at");
      setRows((data as ContactRow[]) || []);
      setLoading(false);
    };
    run();
  }, []);

  const items = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        emailT: (r.email || "").trim() || null,
        phoneT: (r.phone || "").trim() || null,
      })),
    [rows],
  );

  return (
    <div className="space-y-6">
      {showHeading ? <h2 className="font-heading text-2xl font-bold text-foreground">Kontakty</h2> : null}

      {introHtml?.trim() ? (
        looksLikeHtml(introHtml) ? (
          <div className="overflow-x-auto">
            <div className="slk-rich" dangerouslySetInnerHTML={{ __html: introHtml }} />
          </div>
        ) : (
          <div className="whitespace-pre-line text-foreground">{introHtml}</div>
        )
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Načítavam...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Žiadne kontakty.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((c) => (
            <article
              key={c.id}
              className="border border-border bg-[#f2eee6] bg-[length:4px_4px] bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)]"
            >
              <div className="m-3 border border-border bg-[#fff7e3] p-4 text-center">
                <div className="font-heading font-bold uppercase tracking-wide text-sm text-foreground">
                  {c.position_title}
                </div>

                <div className="mt-3 mx-auto w-[220px] max-w-full aspect-square bg-slk-cream overflow-hidden">
                  {c.photo_url ? <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" /> : null}
                </div>

                <div className="mt-3 font-heading font-semibold text-foreground break-words">{c.name}</div>

                <div className="mt-4 space-y-2 text-sm">
                  {c.emailT ? (
                    <a className="inline-flex items-center justify-center gap-2 text-accent underline break-words" href={`mailto:${c.emailT}`}>
                      <Mail className="w-4 h-4" />
                      {c.emailT}
                    </a>
                  ) : null}
                  {c.phoneT ? (
                    <div className="inline-flex items-center justify-center gap-2 text-foreground break-words">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      {c.phoneT}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactsContent;

