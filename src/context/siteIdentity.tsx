import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteIdentity = {
  siteTitle?: string;
  tagline?: string;
  faviconUrl?: string;
  logoUrl?: string;
  backgroundUrl?: string;
};

type SiteIdentityContextValue = {
  identity: SiteIdentity | null;
  loading: boolean;
};

const SiteIdentityContext = createContext<SiteIdentityContextValue | null>(null);

function safeJsonObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function jsonGetString(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function appendVersion(url: string, version: string | null | undefined) {
  if (!version) return url;
  const hasQuery = url.includes("?");
  const sep = hasQuery ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(version)}`;
}

function setFavicon(href: string) {
  const selectors = [
    `link[rel="icon"]`,
    `link[rel="shortcut icon"]`,
    `link[rel="apple-touch-icon"]`,
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLLinkElement>(sel);
    if (el) el.href = href;
  }
}

function setBodyBackground(href: string | null | undefined) {
  if (href && href.trim()) {
    document.body.style.backgroundImage = `url("${href}")`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center -10px";
    document.body.style.backgroundAttachment = "fixed";
    document.body.style.backgroundRepeat = "no-repeat";
  } else {
    // Reset to CSS fallback from index.css
    document.body.style.backgroundImage = "";
    document.body.style.backgroundSize = "";
    document.body.style.backgroundPosition = "";
    document.body.style.backgroundAttachment = "";
    document.body.style.backgroundRepeat = "";
  }
}

export function SiteIdentityProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [identity, setIdentity] = useState<SiteIdentity | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_settings")
        .select("value, updated_at")
        .eq("key", "identity")
        .maybeSingle();

      if (error) {
        setIdentity(null);
        setLoading(false);
        return;
      }

      const obj = safeJsonObject(data?.value);
      const version = (data as { updated_at?: string | null } | null)?.updated_at ?? null;
      const parsed: SiteIdentity = {
        siteTitle: jsonGetString(obj, "siteTitle") || undefined,
        tagline: jsonGetString(obj, "tagline") || undefined,
        faviconUrl: (() => {
          const u = jsonGetString(obj, "faviconUrl");
          return u ? appendVersion(u, version) : undefined;
        })(),
        logoUrl: (() => {
          const u = jsonGetString(obj, "logoUrl");
          return u ? appendVersion(u, version) : undefined;
        })(),
        backgroundUrl: (() => {
          const u = jsonGetString(obj, "backgroundUrl");
          return u ? appendVersion(u, version) : undefined;
        })(),
      };
      setIdentity(
        parsed.siteTitle || parsed.tagline || parsed.faviconUrl || parsed.logoUrl || parsed.backgroundUrl
          ? parsed
          : null,
      );
      setLoading(false);
    };

    run();
  }, []);

  useEffect(() => {
    if (identity?.faviconUrl) setFavicon(identity.faviconUrl);
  }, [identity?.faviconUrl]);

  useEffect(() => {
    setBodyBackground(identity?.backgroundUrl);
  }, [identity?.backgroundUrl]);

  const value = useMemo<SiteIdentityContextValue>(() => ({ identity, loading }), [identity, loading]);

  return <SiteIdentityContext.Provider value={value}>{children}</SiteIdentityContext.Provider>;
}

export function useSiteIdentity() {
  const ctx = useContext(SiteIdentityContext);
  if (!ctx) throw new Error("useSiteIdentity must be used within SiteIdentityProvider");
  return ctx;
}

