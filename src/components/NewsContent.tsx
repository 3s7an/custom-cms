import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StructuredData from "@/components/StructuredData";
import { useOrganizationSchema } from "@/hooks/useOrganizationSchema";
import {
  buildBreadcrumbList,
  buildNewsArticles,
  buildWebPage,
  toJsonLdGraph,
} from "@/lib/structuredData";

type Post = {
  id: string;
  title: string;
  content: string;
  published_date: string | null;
  created_at: string;
};

type Props = {
  showHeading?: boolean;
  /** When set, emits NewsArticle JSON-LD for this listing page (e.g. slug novinky). */
  structuredDataSlug?: string;
};

const looksLikeHtml = (value: string) => /<([a-z][\w-]*)(\s[^>]*)?>/i.test(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return {
    day: d.getDate().toString(),
    month: (d.getMonth() + 1).toString().padStart(2, "0"),
    year: d.getFullYear().toString(),
  };
};

const toYear = (dateStr: string) => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  return Number.isFinite(y) ? y : null;
};

const NewsContent = ({ showHeading = true, structuredDataSlug }: Props) => {
  const { organization, website, orgName } = useOrganizationSchema();
  const [posts, setPosts] = useState<Post[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchYearsAndDefault = async () => {
      const { data: novinkyPage } = await supabase
        .from("pages")
        .select("id")
        .eq("slug", "novinky")
        .single();

      if (novinkyPage) {
        const { data } = await supabase
          .from("posts")
          .select("published_date, created_at")
          .eq("page_id", novinkyPage.id)
          .eq("published", true)
          .order("published_date", { ascending: false });
        const ys = Array.from(
          new Set(
            (data || [])
              .map((r) => toYear(r.published_date || r.created_at))
              .filter((y): y is number => typeof y === "number" && Number.isFinite(y)),
          ),
        ).sort((a, b) => b - a);
        setYears(ys);

        const yearFromUrlRaw = (searchParams.get("year") || "").trim();
        const yearFromUrl = yearFromUrlRaw ? Number.parseInt(yearFromUrlRaw, 10) : NaN;
        const urlOk = Number.isFinite(yearFromUrl) && ys.includes(yearFromUrl);
        const defaultYear = urlOk ? yearFromUrl : ys[0] ?? null;
        setSelectedYear(defaultYear);
      }
    };
    void fetchYearsAndDefault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const yearRange = useMemo(() => {
    if (!selectedYear) return null;
    const y = selectedYear;
    return {
      y,
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      startTs: `${y}-01-01T00:00:00.000Z`,
      endTs: `${y}-12-31T23:59:59.999Z`,
    };
  }, [selectedYear]);

  useEffect(() => {
    if (!yearRange) return;

    const fetchPostsForYear = async () => {
      const { data: novinkyPage } = await supabase
        .from("pages")
        .select("id")
        .eq("slug", "novinky")
        .single();

      if (!novinkyPage) {
        setPosts([]);
        return;
      }

      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("page_id", novinkyPage.id)
        .eq("published", true)
        .or(
          `and(published_date.gte.${yearRange.startDate},published_date.lte.${yearRange.endDate}),and(published_date.is.null,created_at.gte.${yearRange.startTs},created_at.lte.${yearRange.endTs})`,
        )
        .order("published_date", { ascending: false })
        .order("created_at", { ascending: false });

      setPosts((data as Post[]) || []);
    };

    void fetchPostsForYear();
  }, [yearRange]);

  const setYearAndUrl = (y: number) => {
    setSelectedYear(y);
    const next = new URLSearchParams(searchParams);
    next.set("year", String(y));
    setSearchParams(next, { replace: true });
  };

  const structuredData = useMemo(() => {
    if (!structuredDataSlug || posts.length === 0) return null;
    const path = `/${structuredDataSlug}`;
    const pageName = "Novinky";
    const webpage = buildWebPage({
      path,
      name: pageName,
      type: "CollectionPage",
    });
    const articles = buildNewsArticles(posts, path);
    const breadcrumb = buildBreadcrumbList([
      { name: orgName, path: "/" },
      { name: pageName, path },
    ]);
    return toJsonLdGraph(organization, website, webpage, breadcrumb, ...articles);
  }, [
    structuredDataSlug,
    posts,
    showHeading,
    organization,
    website,
    orgName,
  ]);

  return (
    <div className="px-4 py-4">
      {structuredData ? <StructuredData data={structuredData} /> : null}
      {showHeading ? (
        <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
          Novinky
        </h1>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rok</span>
          <select
            className="h-9 border border-border bg-background px-2 text-sm"
            value={selectedYear ?? ""}
            onChange={(e) => {
              const y = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(y)) setYearAndUrl(y);
            }}
            disabled={years.length === 0}
          >
            {years.length === 0 ? <option value="">—</option> : null}
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {posts.map((post, index) => {
        const date = formatDate(post.published_date || post.created_at);
        return (
          <article key={post.id} className="mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 bg-slk-brown text-slk-cream text-xs text-center px-2 py-1 min-w-[45px]">
                <div className="font-bold">
                  {date.day}. {date.month}
                </div>
                <div>{date.year}</div>
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground leading-tight">
                <a href="#" className="text-foreground hover:text-slk-link">
                  {post.title}
                </a>
              </h2>
            </div>

            {looksLikeHtml(post.content) ? (
              <div className="overflow-x-auto mb-3">
                <div
                  className="slk-rich"
                  dangerouslySetInnerHTML={{ __html: post.content }}
                />
              </div>
            ) : (
              <div className="whitespace-pre-line text-foreground text-justify leading-relaxed mb-3">
                {post.content}
              </div>
            )}

            {index < posts.length - 1 && (
              <hr className="mt-6 border-border" />
            )}
          </article>
        );
      })}

      {posts.length === 0 ? (
        <p className="text-muted-foreground">
          {selectedYear ? `Žiadne novinky pre rok ${selectedYear}.` : "Žiadne novinky."}
        </p>
      ) : null}
    </div>
  );
};

export default NewsContent;
