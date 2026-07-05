import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import heroBanner from "@/assets/hero-banner.jpg";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useSiteIdentity } from "@/context/siteIdentity";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

type NavbarImage = { public_url: string; alt: string | null; sort_order: number };

function safeJsonObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function jsonGetNumber(obj: Record<string, unknown> | null, key: string): number | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function jsonGetString(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function appendVersion(url: string, version: string | null | undefined) {
  if (!version) return url;
  const hasQuery = url.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

const Header = () => {
  const { identity } = useSiteIdentity();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  const [images, setImages] = useState<NavbarImage[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const fetchAssets = async () => {
      const [settingsRes, imagesRes] = await Promise.all([
        supabase.from("site_settings").select("key, value, updated_at").in("key", ["logo", "navbar"]),
        supabase.from("navbar_images").select("public_url, alt, sort_order").eq("enabled", true).order("sort_order").order("created_at"),
      ]);

      if (!settingsRes.error) {
        const map = new Map<string, Json>();
        const updatedAt = new Map<string, string | null>();
        for (const r of settingsRes.data || []) {
          map.set(r.key, r.value);
          updatedAt.set(r.key, (r as { updated_at?: string | null }).updated_at ?? null);
        }

        const logoObj = safeJsonObject(map.get("logo"));
        const navbarObj = safeJsonObject(map.get("navbar"));

        const rawLogoUrl = jsonGetString(logoObj, "url");
        setLogoUrl(rawLogoUrl ? appendVersion(rawLogoUrl, updatedAt.get("logo")) : null);

        const s = jsonGetNumber(navbarObj, "intervalSeconds");
        setIntervalSeconds(s && s > 0 ? s : 5);
      }

      if (!imagesRes.error) {
        setImages(imagesRes.data || []);
      }
    };

    fetchAssets();
  }, []);

  const effectiveImages = useMemo(() => images.filter((i) => i.public_url), [images]);

  useEffect(() => {
    setActiveIdx(0);
  }, [effectiveImages.length]);

  useEffect(() => {
    if (effectiveImages.length <= 1) return;
    const ms = Math.max(1000, Math.floor((intervalSeconds || 5) * 1000));
    const t = window.setInterval(() => {
      setActiveIdx((i) => (i + 1) % effectiveImages.length);
    }, ms);
    return () => window.clearInterval(t);
  }, [effectiveImages.length, intervalSeconds]);

  const resolvedLogo = identity?.logoUrl || logoUrl;

  return (
    <header className="relative w-full overflow-visible lg:h-[350px]">
      <div className="absolute inset-x-0 top-0 z-30 lg:hidden">
        <div className="bg-slk-brown border-b border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Otvoriť menu"
                  className="bg-white/10 hover:bg-white/15 text-[#fff7e3] border border-white/15"
                >
                  <Menu className="h-5 w-5 text-current" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex h-full max-h-[100dvh] flex-col gap-0 overflow-hidden p-0 bg-slk-cream"
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 pt-14 pb-8">
                  <Sidebar />
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-2 min-w-0 text-[#fff7e3]">
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt="Slovenský Leonberger Klub"
                  className="w-7 h-7 object-contain"
                  width={28}
                  height={28}
                />
              ) : null}
              <span className="font-heading font-bold capitalize truncate">
                Slovenský Leonberger Klub
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="relative w-full h-full mb-[20px] overflow-hidden hidden lg:block">
        {effectiveImages.length > 0 ? (
          <>
            {effectiveImages.map((img, idx) => (
              <img
                key={`${img.public_url}-${idx}`}
                src={img.public_url}
                alt={img.alt || "Leonberger dogs"}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
                style={{ opacity: idx === activeIdx ? 1 : 0 }}
                width={1400}
                height={350}
              />
            ))}
          </>
        ) : (
          <img
            src={heroBanner}
            alt="Leonberger dogs"
            className="w-full h-full object-cover"
            width={1400}
            height={350}
          />
        )}
      </div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
        <Link
          to="/"
          className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-slk-brown rounded-none"
        >
          <div className="bg-slk-cream px-1 py-7 shadow-[0_10px_20px_rgba(0,0,0,0.28)]">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt="Slovenský Leonberger Klub"
                className="w-[208px] h-[208px] rounded-none"
                width={208}
                height={208}
              />
            ) : (
              <div className="w-[208px] h-[208px]" aria-hidden />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
