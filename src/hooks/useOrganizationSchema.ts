import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteIdentity } from "@/context/siteIdentity";
import {
  buildOrganization,
  buildWebSite,
  getSiteOrigin,
  type OrganizationInput,
} from "@/lib/structuredData";

function safeJsonObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function jsonGetString(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const val = obj[key];
  return typeof val === "string" && val.trim() ? val.trim() : null;
}

const DEFAULT_EMAIL = "info@example.com";
const DEFAULT_FACEBOOK = "https://www.facebook.com";
const DEFAULT_NAME = "Moja stránka";

export function useOrganizationSchema() {
  const { identity } = useSiteIdentity();
  const [footer, setFooter] = useState<{ email?: string; facebook?: string; name?: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "footer")
        .maybeSingle();
      if (cancelled) return;
      const obj = safeJsonObject(data?.value);
      setFooter({
        email: jsonGetString(obj, "contactEmail") || undefined,
        facebook: jsonGetString(obj, "facebookUrl") || undefined,
        name: jsonGetString(obj, "copyrightText") || undefined,
      });
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const origin = getSiteOrigin();
  const orgName = identity?.siteTitle || footer?.name || DEFAULT_NAME;
  const orgInput: OrganizationInput = {
    name: orgName,
    url: origin,
    logo: identity?.logoUrl || undefined,
    email: footer?.email || DEFAULT_EMAIL,
    description: identity?.tagline || undefined,
    sameAs: [footer?.facebook || DEFAULT_FACEBOOK].filter(Boolean),
  };

  const organization = buildOrganization(orgInput, origin);
  const website = buildWebSite(
    { name: orgName, description: identity?.tagline || undefined },
    origin,
  );

  return { organization, website, orgName, origin };
}
