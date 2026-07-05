import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PublicPageShell from "@/components/PublicPageShell";
import NotFoundContent from "@/components/NotFoundContent";
import StructuredData from "@/components/StructuredData";
import { useOrganizationSchema } from "@/hooks/useOrganizationSchema";
import {
  buildBreadcrumbList,
  buildWebPage,
  stripHtml,
  toJsonLdGraph,
} from "@/lib/structuredData";
import NewsContent from "@/components/NewsContent";
import MatingSheetsContent from "@/components/MatingSheetsContent";
import KennelsContent from "@/components/KennelsContent";
import ContactsContent from "@/components/ContactsContent";
import ShowResultsContent from "@/components/ShowResultsContent";
import CalendarTableContent from "@/components/CalendarTableContent";
import LeonbergerListSection from "@/components/leonberger/LeonbergerListSection";
import { useSiteIdentity } from "@/context/siteIdentity";
import { parseLeonbergerListMode } from "@/lib/leonbergerDisplay";

type PageData = {
  id: string;
  title: string;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  leonberger_list_mode: string | null;
};

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

const CONTACT_SLUGS = new Set(["kontakty", "vybor-a-kontakty"]);

const PageView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const { identity } = useSiteIdentity();
  const { organization, website, orgName } = useOrganizationSchema();

  const setMetaDescription = (content: string) => {
    const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (el) el.content = content;
  };

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("pages")
        .select("id, title, content, meta_title, meta_description, leonberger_list_mode")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setPage(data);
      setLoading(false);
    };
    if (slug) fetchPage();
  }, [slug]);

  useEffect(() => {
    if (loading) return;
    if (!page) {
      document.title = "Stránka sa nenašla";
      return;
    }
    const title = (page.meta_title || page.title || identity?.siteTitle || "").trim();
    if (title) document.title = title;

    const desc = (page.meta_description || identity?.tagline || "").trim();
    if (desc) setMetaDescription(desc);
  }, [page, loading, identity?.siteTitle, identity?.tagline]);

  const listMode = page ? parseLeonbergerListMode(page.leonberger_list_mode) : null;
  const hasIntro = Boolean(page?.content?.trim());

  const structuredData = useMemo(() => {
    if (!page || !slug || slug === "novinky") return null;
    const path = `/${slug}`;
    const description =
      (page.meta_description || "").trim() ||
      (page.content?.trim() ? stripHtml(page.content).slice(0, 300) : "") ||
      identity?.tagline ||
      undefined;
    const webpage = buildWebPage({
      path,
      name: page.meta_title || page.title,
      description: description || undefined,
      type: CONTACT_SLUGS.has(slug) ? "ContactPage" : "WebPage",
    });
    const breadcrumb = buildBreadcrumbList([
      { name: orgName, path: "/" },
      { name: page.title, path },
    ]);
    return toJsonLdGraph(organization, website, webpage, breadcrumb);
  }, [page, slug, organization, website, orgName, identity?.tagline]);

  return (
    <PublicPageShell>
      <StructuredData data={structuredData} />
      {loading ? (
        <p className="text-muted-foreground">Načítavam...</p>
      ) : page ? (
        <div>
          <h1 className="font-heading text-2xl font-bold mb-4">{page.title}</h1>
          {slug === "novinky" ? (
            <NewsContent showHeading={false} structuredDataSlug="novinky" />
          ) : slug === "krytia-planovane-vrhy" ? (
            <MatingSheetsContent showHeading={false} introHtml={page.content} section="planned" />
          ) : slug === "aktualne-vrhy-steniatka" ? (
            <MatingSheetsContent showHeading={false} introHtml={page.content} section="current" />
          ) : slug === "prehlad-vrhov" ? (
            <MatingSheetsContent showHeading={false} introHtml={page.content} section="overview" />
          ) : slug === "vysledky" ? (
            <ShowResultsContent pageId={page.id} />
          ) : slug === "kalendar" ? (
            <CalendarTableContent pageId={page.id} />
          ) : slug === "chovatelske-stanice" ? (
            <KennelsContent showHeading={false} introHtml={page.content} />
          ) : slug === "kontakty" || slug === "vybor-a-kontakty" ? (
            <ContactsContent showHeading={false} introHtml={page.content} />
          ) : (
            <>
          {listMode && hasIntro ? (
            looksLikeHtml(page.content) ? (
              <div className="overflow-x-auto mb-6">
                <div
                  className="slk-rich"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </div>
            ) : (
              <div className="whitespace-pre-line text-foreground mb-6">{page.content}</div>
            )
          ) : null}
          {listMode ? (
            <LeonbergerListSection mode={listMode} />
          ) : null}
          {!listMode && hasIntro ? (
            looksLikeHtml(page.content) ? (
              <div className="overflow-x-auto">
                <div
                  className="slk-rich"
                  dangerouslySetInnerHTML={{ __html: page.content }}
                />
              </div>
            ) : (
              <div className="whitespace-pre-line text-foreground">{page.content}</div>
            )
          ) : null}
            </>
          )}
        </div>
      ) : (
        <NotFoundContent />
      )}
    </PublicPageShell>
  );
};

export default PageView;
