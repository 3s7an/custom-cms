import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { toAbsoluteHttpUrl } from "@/lib/leonbergerDisplay";

type NavbarImage = {
  id: string;
  storage_path: string;
  public_url: string;
  alt: string | null;
  sort_order: number;
  enabled: boolean;
};

type LogoSetting = { url?: string; storage_path?: string } | null;
type NavbarSetting = { intervalSeconds?: number } | null;
type IdentitySetting = {
  siteTitle?: string;
  tagline?: string;
  faviconUrl?: string;
  faviconStoragePath?: string;
  logoUrl?: string;
  logoStoragePath?: string;
  backgroundUrl?: string;
  backgroundStoragePath?: string;
} | null;

type FooterSetting = {
  contactEmail?: string;
  facebookUrl?: string;
  copyrightText?: string;
} | null;

type FooterLink = {
  id: string;
  storage_path: string;
  public_url: string;
  alt: string | null;
  href: string;
  sort_order: number;
  enabled: boolean;
};

async function uploadToSiteAssets(path: string, file: File, upsert = false) {
  const { error } = await supabase.storage.from("site-assets").upload(path, file, { upsert });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
  return { publicUrl: urlData.publicUrl, storagePath: path };
}

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

function getErrorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "Neznáma chyba";
}

const SiteAssetsManager = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logo, setLogo] = useState<LogoSetting>(null);
  const [navbar, setNavbar] = useState<NavbarSetting>(null);
  const [identity, setIdentity] = useState<IdentitySetting>(null);
  const [footer, setFooter] = useState<FooterSetting>(null);

  const [intervalSeconds, setIntervalSeconds] = useState<number>(5);
  const [navbarImages, setNavbarImages] = useState<NavbarImage[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);

  const currentLogoUrl = useMemo(() => (logo && typeof logo.url === "string" ? logo.url : null), [logo]);
  const currentFaviconUrl = useMemo(
    () => (identity && typeof identity.faviconUrl === "string" ? identity.faviconUrl : null),
    [identity],
  );
  const currentBackgroundUrl = useMemo(
    () => (identity && typeof identity.backgroundUrl === "string" ? identity.backgroundUrl : null),
    [identity],
  );

  const [siteTitle, setSiteTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [copyrightText, setCopyrightText] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [settingsRes, imagesRes, footerLinksRes] = await Promise.all([
      supabase.from("site_settings").select("key, value").in("key", ["logo", "navbar", "identity", "footer"]),
      supabase.from("navbar_images").select("id, storage_path, public_url, alt, sort_order, enabled").order("sort_order").order("created_at"),
      supabase.from("footer_links").select("id, storage_path, public_url, alt, href, sort_order, enabled").order("sort_order").order("created_at"),
    ]);

    if (settingsRes.error) {
      toast({ title: "Chyba", description: settingsRes.error.message, variant: "destructive" });
    } else {
      const map = new Map<string, Json>();
      for (const r of settingsRes.data || []) map.set(r.key, r.value);

      const logoObj = safeJsonObject(map.get("logo"));
      const navbarObj = safeJsonObject(map.get("navbar"));
      const identityObj = safeJsonObject(map.get("identity"));
      const footerObj = safeJsonObject(map.get("footer"));

      const logoValue: LogoSetting = {
        url: jsonGetString(logoObj, "url") || undefined,
        storage_path: jsonGetString(logoObj, "storage_path") || undefined,
      };
      setLogo((logoValue.url || logoValue.storage_path) ? logoValue : null);

      const navbarValue: NavbarSetting = {
        intervalSeconds: jsonGetNumber(navbarObj, "intervalSeconds") || undefined,
      };
      setNavbar(navbarValue.intervalSeconds ? navbarValue : null);

      const fromDbInterval = navbarValue.intervalSeconds;
      setIntervalSeconds(fromDbInterval && fromDbInterval > 0 ? fromDbInterval : 5);

      const identityValue: IdentitySetting = {
        siteTitle: jsonGetString(identityObj, "siteTitle") || undefined,
        tagline: jsonGetString(identityObj, "tagline") || undefined,
        faviconUrl: jsonGetString(identityObj, "faviconUrl") || undefined,
        faviconStoragePath: jsonGetString(identityObj, "faviconStoragePath") || undefined,
        logoUrl: jsonGetString(identityObj, "logoUrl") || undefined,
        logoStoragePath: jsonGetString(identityObj, "logoStoragePath") || undefined,
        backgroundUrl: jsonGetString(identityObj, "backgroundUrl") || undefined,
        backgroundStoragePath: jsonGetString(identityObj, "backgroundStoragePath") || undefined,
      };
      setIdentity(
        (identityValue.siteTitle ||
          identityValue.tagline ||
          identityValue.faviconUrl ||
          identityValue.faviconStoragePath ||
          identityValue.logoUrl ||
          identityValue.logoStoragePath ||
          identityValue.backgroundUrl ||
          identityValue.backgroundStoragePath)
          ? identityValue
          : null,
      );

      setSiteTitle(identityValue.siteTitle || "");
      setTagline(identityValue.tagline || "");

      const footerValue: FooterSetting = {
        contactEmail: jsonGetString(footerObj, "contactEmail") || undefined,
        facebookUrl: jsonGetString(footerObj, "facebookUrl") || undefined,
        copyrightText: jsonGetString(footerObj, "copyrightText") || undefined,
      };
      setFooter(
        (footerValue.contactEmail || footerValue.facebookUrl || footerValue.copyrightText) ? footerValue : null
      );
      setContactEmail(footerValue.contactEmail || "");
      setFacebookUrl(footerValue.facebookUrl || "");
      setCopyrightText(footerValue.copyrightText || "");
    }

    if (imagesRes.error) {
      toast({ title: "Chyba", description: imagesRes.error.message, variant: "destructive" });
    } else {
      setNavbarImages(imagesRes.data || []);
    }

    if (footerLinksRes.error) {
      toast({ title: "Chyba", description: footerLinksRes.error.message, variant: "destructive" });
    } else {
      setFooterLinks(footerLinksRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    const payload: NavbarSetting = { intervalSeconds: Math.max(1, Math.floor(intervalSeconds || 5)) };
    const { error } = await supabase.from("site_settings").upsert({ key: "navbar", value: payload });
    setSaving(false);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Uložené" });
    fetchData();
  };

  const handleSaveIdentity = async () => {
    setSaving(true);
    const payload = {
      siteTitle: siteTitle.trim(),
      tagline: tagline.trim(),
      faviconUrl: identity?.faviconUrl,
      faviconStoragePath: identity?.faviconStoragePath,
      logoUrl: identity?.logoUrl,
      logoStoragePath: identity?.logoStoragePath,
      backgroundUrl: identity?.backgroundUrl,
      backgroundStoragePath: identity?.backgroundStoragePath,
    };

    const { error } = await supabase.from("site_settings").upsert({ key: "identity", value: payload });
    setSaving(false);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Uložené" });
    fetchData();
  };

  const handleSaveFooter = async () => {
    setSaving(true);
    const rawBase = copyrightText.trim();
    const baseNoYear = rawBase.replace(/\s+\d{4}\s*$/, "").trim();
    const payload = {
      contactEmail: contactEmail.trim(),
      facebookUrl: facebookUrl.trim(),
      copyrightText: baseNoYear,
    };
    const { error } = await supabase.from("site_settings").upsert({ key: "footer", value: payload });
    setSaving(false);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Uložené" });
    fetchData();
  };

  const handleFaviconUpload = async (file: File) => {
    try {
      setSaving(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `favicon/favicon.${ext}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file, true);

      const payload = {
        siteTitle: siteTitle.trim(),
        tagline: tagline.trim(),
        faviconUrl: publicUrl,
        faviconStoragePath: storagePath,
        logoUrl: identity?.logoUrl,
        logoStoragePath: identity?.logoStoragePath,
        backgroundUrl: identity?.backgroundUrl,
        backgroundStoragePath: identity?.backgroundStoragePath,
      };

      const { error } = await supabase.from("site_settings").upsert({ key: "identity", value: payload });
      if (error) throw error;

      toast({ title: "Favicon uložený" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa nahrať favicon", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    try {
      setSaving(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo/logo.${ext}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file, true);
      const { error } = await supabase.from("site_settings").upsert({
        key: "logo",
        value: { url: publicUrl, storage_path: storagePath },
      });
      if (error) throw error;

      const identityPayload = {
        siteTitle: siteTitle.trim(),
        tagline: tagline.trim(),
        faviconUrl: identity?.faviconUrl,
        faviconStoragePath: identity?.faviconStoragePath,
        logoUrl: publicUrl,
        logoStoragePath: storagePath,
        backgroundUrl: identity?.backgroundUrl,
        backgroundStoragePath: identity?.backgroundStoragePath,
      };
      await supabase.from("site_settings").upsert({ key: "identity", value: identityPayload });

      toast({ title: "Logo uložené" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa nahrať logo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    try {
      setSaving(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "jpg";
      const path = `background/background.${safeExt}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file, true);

      const payload = {
        siteTitle: siteTitle.trim(),
        tagline: tagline.trim(),
        faviconUrl: identity?.faviconUrl,
        faviconStoragePath: identity?.faviconStoragePath,
        logoUrl: identity?.logoUrl,
        logoStoragePath: identity?.logoStoragePath,
        backgroundUrl: publicUrl,
        backgroundStoragePath: storagePath,
      };

      const { error } = await supabase.from("site_settings").upsert({ key: "identity", value: payload });
      if (error) throw error;

      toast({ title: "Pozadie uložené" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa nahrať pozadie", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBackgroundReset = async () => {
    try {
      setSaving(true);
      const payload = {
        siteTitle: siteTitle.trim(),
        tagline: tagline.trim(),
        faviconUrl: identity?.faviconUrl,
        faviconStoragePath: identity?.faviconStoragePath,
        logoUrl: identity?.logoUrl,
        logoStoragePath: identity?.logoStoragePath,
        backgroundUrl: null,
        backgroundStoragePath: null,
      };
      const { error } = await supabase.from("site_settings").upsert({ key: "identity", value: payload });
      if (error) throw error;
      toast({ title: "Pozadie resetované" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa resetovať pozadie", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNavbarImage = async (file: File) => {
    try {
      setSaving(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `navbar/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file, false);

      const maxOrder = navbarImages.reduce((m, i) => Math.max(m, i.sort_order), 0);
      const { error } = await supabase.from("navbar_images").insert({
        storage_path: storagePath,
        public_url: publicUrl,
        alt: "",
        sort_order: maxOrder + 1,
        enabled: true,
      });
      if (error) throw error;
      toast({ title: "Obrázok pridaný" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa pridať obrázok", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateRow = async (id: string, patch: Partial<NavbarImage>) => {
    const { error } = await supabase.from("navbar_images").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const deleteRow = async (img: NavbarImage) => {
    if (!confirm("Zmazať obrázok z navbaru?")) return;
    setSaving(true);
    try {
      const delDb = await supabase.from("navbar_images").delete().eq("id", img.id);
      if (delDb.error) throw delDb.error;
      await supabase.storage.from("site-assets").remove([img.storage_path]);
      toast({ title: "Zmazané" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa zmazať obrázok", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFooterLink = async (file: File) => {
    try {
      setSaving(true);
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `footer/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { publicUrl, storagePath } = await uploadToSiteAssets(path, file, false);

      const maxOrder = footerLinks.reduce((m, i) => Math.max(m, i.sort_order), 0);
      const { error } = await supabase.from("footer_links").insert({
        storage_path: storagePath,
        public_url: publicUrl,
        alt: "",
        href: "",
        sort_order: maxOrder + 1,
        enabled: true,
      });
      if (error) throw error;
      toast({ title: "Footer link pridaný" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa pridať footer link", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateFooterLink = async (id: string, patch: Partial<FooterLink>) => {
    const { error } = await supabase.from("footer_links").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const deleteFooterLink = async (img: FooterLink) => {
    if (!confirm("Zmazať footer link?")) return;
    setSaving(true);
    try {
      const delDb = await supabase.from("footer_links").delete().eq("id", img.id);
      if (delDb.error) throw delDb.error;
      await supabase.storage.from("site-assets").remove([img.storage_path]);
      toast({ title: "Zmazané" });
      fetchData();
    } catch (e: unknown) {
      toast({ title: "Chyba", description: getErrorMessage(e) || "Nepodarilo sa zmazať footer link", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Načítavam...</p>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border p-4">
        <h3 className="font-heading text-lg font-bold mb-3">Identita stránky</h3>

        <div className="grid grid-cols-2 gap-3 mb-4 max-w-3xl">
          <div>
            <Label>Názov stránky</Label>
            <Input value={siteTitle} disabled={saving} onChange={(e) => setSiteTitle(e.target.value)} />
          </div>
          <div>
            <Label>Slogan</Label>
            <Input value={tagline} disabled={saving} onChange={(e) => setTagline(e.target.value)} />
          </div>
          <div className="col-span-2 flex gap-2">
            <Button onClick={handleSaveIdentity} disabled={saving}>
              Uložiť identitu
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-[80px] h-[80px] border border-border bg-slk-cream flex items-center justify-center overflow-hidden">
            {currentFaviconUrl ? (
              <img src={currentFaviconUrl} alt="Favicon" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="faviconUpload">Favicon (ikona webu)</Label>
            <Input
              id="faviconUpload"
              type="file"
              accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFaviconUpload(f);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              Odporúčanie: 512×512 PNG alebo .ico (kvôli kompatibilite).
            </p>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-heading font-semibold mb-2">Pozadie stránky</h4>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="w-full md:w-[220px] h-[120px] border border-border bg-slk-cream overflow-hidden flex items-center justify-center">
              {currentBackgroundUrl ? (
                <img src={currentBackgroundUrl} alt="Pozadie" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Používa sa default</span>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="backgroundUpload">Nahrať nové pozadie</Label>
              <Input
                id="backgroundUpload"
                type="file"
                accept="image/*"
                disabled={saving}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBackgroundUpload(f);
                  e.currentTarget.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={saving || !currentBackgroundUrl} onClick={handleBackgroundReset}>
                  Reset na default
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: použite skôr širší obrázok (napr. 1920×1080). Pozadie sa zobrazuje s <code>cover</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-4">
        <h3 className="font-heading text-lg font-bold mb-3">Logo</h3>
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] border border-border bg-slk-cream flex items-center justify-center overflow-hidden">
            {currentLogoUrl ? (
              <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUpload">Nahrať nové logo (statické)</Label>
            <Input
              id="logoUpload"
              type="file"
              accept="image/*"
              disabled={saving}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogoUpload(f);
                e.currentTarget.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              Odporúčanie: PNG so transparentným pozadím.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border p-4">
        <h3 className="font-heading text-lg font-bold mb-3">Navbar obrázky (rotácia)</h3>

        <div className="grid grid-cols-3 gap-3 mb-4 max-w-xl">
          <div>
            <Label>Interval (sekundy)</Label>
            <Input
              type="number"
              min={1}
              value={intervalSeconds}
              disabled={saving}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSaveSettings} disabled={saving}>
              Uložiť interval
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="navbarUpload">Pridať obrázok do rotácie</Label>
          <Input
            id="navbarUpload"
            type="file"
            accept="image/*"
            disabled={saving}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAddNavbarImage(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {navbarImages.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatiaľ nemáš pridané žiadne obrázky.</p>
        ) : (
          <div className="space-y-2">
            {navbarImages.map((img) => (
              <div key={img.id} className="border border-border bg-background p-3 flex gap-3 items-center">
                <div className="w-20 h-20 border border-border bg-slk-cream overflow-hidden flex items-center justify-center">
                  <img src={img.public_url} alt={img.alt || ""} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 grid grid-cols-6 gap-2 items-end">
                  <div className="col-span-3">
                    <Label>Alt text</Label>
                    <Input
                      value={img.alt || ""}
                      disabled={saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNavbarImages((prev) => prev.map((p) => (p.id === img.id ? { ...p, alt: v } : p)));
                      }}
                      onBlur={() => updateRow(img.id, { alt: (img.alt || "").trim() })}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Poradie</Label>
                    <Input
                      type="number"
                      value={img.sort_order}
                      disabled={saving}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setNavbarImages((prev) => prev.map((p) => (p.id === img.id ? { ...p, sort_order: v } : p)));
                      }}
                      onBlur={() => updateRow(img.id, { sort_order: img.sort_order })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center gap-2 pb-2">
                    <Switch
                      checked={img.enabled}
                      disabled={saving}
                      onCheckedChange={(v) => updateRow(img.id, { enabled: v })}
                    />
                    <span className="text-sm">Zap.</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" disabled={saving} onClick={() => deleteRow(img)} title="Zmazať">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border p-4">
        <h3 className="font-heading text-lg font-bold mb-3">Footer</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 max-w-4xl">
          <div>
            <Label>Kontaktný e-mail</Label>
            <Input value={contactEmail} disabled={saving} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div>
            <Label>Facebook URL</Label>
            <Input value={facebookUrl} disabled={saving} onChange={(e) => setFacebookUrl(e.target.value)} />
          </div>
          <div>
            <Label>Spodný text (rok sa doplní automaticky)</Label>
            <Input value={copyrightText} disabled={saving} onChange={(e) => setCopyrightText(e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <Label htmlFor="footerUpload">Pridať obrázok (odporúčané linky)</Label>
          <Input
            id="footerUpload"
            type="file"
            accept="image/*"
            disabled={saving}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAddFooterLink(f);
              e.currentTarget.value = "";
            }}
          />
        </div>

        {footerLinks.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatiaľ nemáš pridané žiadne footer linky.</p>
        ) : (
          <div className="space-y-2">
            {footerLinks.map((img) => (
              <div key={img.id} className="border border-border bg-background p-3 flex gap-3 items-center">
                <div className="w-20 h-20 border border-border bg-slk-cream overflow-hidden flex items-center justify-center">
                  <img src={img.public_url} alt={img.alt || ""} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Label>Alt text</Label>
                    <Input
                      value={img.alt || ""}
                      disabled={saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFooterLinks((prev) => prev.map((p) => (p.id === img.id ? { ...p, alt: v } : p)));
                      }}
                      onBlur={() => updateFooterLink(img.id, { alt: (img.alt || "").trim() })}
                    />
                  </div>
                  <div className="col-span-5">
                    <Label>Href</Label>
                    <Input
                      value={img.href || ""}
                      disabled={saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFooterLinks((prev) => prev.map((p) => (p.id === img.id ? { ...p, href: v } : p)));
                      }}
                      onBlur={() => {
                        const trimmed = (img.href || "").trim();
                        const href = toAbsoluteHttpUrl(trimmed) || trimmed;
                        setFooterLinks((prev) =>
                          prev.map((p) => (p.id === img.id ? { ...p, href } : p)),
                        );
                        updateFooterLink(img.id, { href });
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <Label>Poradie</Label>
                    <Input
                      type="number"
                      value={img.sort_order}
                      disabled={saving}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setFooterLinks((prev) => prev.map((p) => (p.id === img.id ? { ...p, sort_order: v } : p)));
                      }}
                      onBlur={() => updateFooterLink(img.id, { sort_order: img.sort_order })}
                    />
                  </div>
                  <div className="col-span-1 flex items-center gap-2 pb-2">
                    <Switch checked={img.enabled} disabled={saving} onCheckedChange={(v) => updateFooterLink(img.id, { enabled: v })} />
                    <span className="text-sm">Zap.</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" disabled={saving} onClick={() => deleteFooterLink(img)} title="Zmazať">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Button onClick={handleSaveFooter} disabled={saving}>
            Uložiť footer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteAssetsManager;

