import { useEffect, useMemo, useState } from "react";
import { Facebook, Link2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Json } from "@/integrations/supabase/types";
import { toAbsoluteHttpUrl } from "@/lib/utils";

type FooterLink = Tables<"footer_links">;

type FooterSetting = {
  contactEmail?: string;
  facebookUrl?: string;
  copyrightText?: string;
} | null;

function safeJsonObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function jsonGetString(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const Footer = () => {
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [settings, setSettings] = useState<FooterSetting>(null);

  const contactEmail = settings?.contactEmail?.trim() || "info@example.com";
  const facebookUrl = settings?.facebookUrl?.trim() || "https://www.facebook.com";
  const footerBaseText = settings?.copyrightText?.trim() || "Moja stránka";
  const copyrightText = `${footerBaseText} ${new Date().getFullYear()}`;

  const visibleLinks = useMemo(
    () => links.filter((x) => x.enabled).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [links],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [linksRes, settingsRes] = await Promise.all([
        supabase
          .from("footer_links")
          .select("id, storage_path, public_url, alt, href, sort_order, enabled, created_at")
          .order("sort_order")
          .order("created_at"),
        supabase.from("site_settings").select("key, value").eq("key", "footer").maybeSingle(),
      ]);

      if (!cancelled) {
        if (!linksRes.error) setLinks(linksRes.data || []);

        if (!settingsRes.error) {
          const obj = safeJsonObject((settingsRes.data?.value as Json) || null);
          const v: FooterSetting = {
            contactEmail: jsonGetString(obj, "contactEmail") || undefined,
            facebookUrl: jsonGetString(obj, "facebookUrl") || undefined,
            copyrightText: jsonGetString(obj, "copyrightText") || undefined,
          };
          setSettings(v.contactEmail || v.facebookUrl || v.copyrightText ? v : null);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="relative overflow-hidden bg-slk-brown text-slk-cream">
      <div className="pointer-events-none absolute inset-0 opacity-[0.55] [background:radial-gradient(circle_at_15%_25%,rgba(233,218,184,0.35),transparent_55%),radial-gradient(circle_at_85%_5%,rgba(233,218,184,0.22),transparent_45%),radial-gradient(circle_at_85%_85%,rgba(0,0,0,0.22),transparent_55%)]" />
      <div className="relative border-t border-white/10 px-6 py-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col gap-2 mb-8">
            <div className="font-heading uppercase tracking-[0.20em] text-[11px] text-slk-cream/80">
              {footerBaseText}
            </div>
            <div className="h-px w-16 bg-slk-cream/40" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="border border-black/10 bg-slk-cream text-slk-brown px-5 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-slk-brown text-slk-cream flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 w-full">
                  <h3 className="font-heading font-semibold text-sm tracking-wide uppercase mb-1">Odporúčané linky</h3>
                  <div className="h-px w-10 bg-slk-brown/35 mb-4" />

                  {visibleLinks.length === 0 ? (
                    <p className="text-sm text-slk-brown/80">—</p>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {visibleLinks.map((x) => {
                        const href = toAbsoluteHttpUrl(x.href);
                        if (!href) return null;
                        return (
                        <a
                          key={x.id}
                          href={href}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="group relative w-[84px] h-[56px] sm:w-[96px] sm:h-[60px] bg-transparent hover:bg-black/5 transition-colors flex items-center justify-center overflow-hidden"
                          title={x.alt || undefined}
                        >
                          <img src={x.public_url} alt={x.alt || ""} className="max-w-full max-h-full object-contain" />
                        </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="border border-black/10 bg-slk-cream text-slk-brown px-5 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-slk-brown text-slk-cream flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 w-full">
                  <h3 className="font-heading font-semibold text-sm tracking-wide uppercase mb-1">Kontaktujte nás</h3>
                  <div className="h-px w-10 bg-slk-brown/35 mb-4" />

                  <div className="flex flex-col gap-3 text-sm">
                    <a
                      className="inline-flex items-center gap-2 text-slk-brown/90 hover:text-slk-brown underline underline-offset-2 break-words"
                      href={`mailto:${contactEmail}`}
                    >
                      <Mail className="w-4 h-4 text-slk-brown/70 shrink-0" />
                      {contactEmail}
                    </a>

                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-2 bg-transparent hover:bg-black/5 transition-colors"
                    >
                      <Facebook className="w-4 h-4 text-slk-brown/70 shrink-0" />
                      <span className="text-slk-brown/90">nájdete nás na Facebooku</span>
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col items-center justify-center gap-1 text-xs text-slk-cream/80 text-center">
            <div>{copyrightText}</div>
            <div className="text-[11px] text-slk-cream">
              developed by{" "}
              <a
                href="https://tristanprekop.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slk-cream underline underline-offset-2"
              >
                tristanprekop.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
