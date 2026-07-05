export function getSiteOrigin(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
  return "https://example.com";
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationId(origin = getSiteOrigin()) {
  return `${origin}/#organization`;
}

export function websiteId(origin = getSiteOrigin()) {
  return `${origin}/#website`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type OrganizationInput = {
  name: string;
  url: string;
  logo?: string | null;
  email?: string | null;
  sameAs?: string[];
  description?: string | null;
};

export function buildOrganization(input: OrganizationInput, origin = getSiteOrigin()) {
  const id = organizationId(origin);
  return {
    "@type": "Organization",
    "@id": id,
    name: input.name,
    url: input.url,
    ...(input.logo ? { logo: { "@type": "ImageObject", url: input.logo } } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
  };
}

export function buildWebSite(input: { name: string; description?: string | null }, origin = getSiteOrigin()) {
  const orgId = organizationId(origin);
  const id = websiteId(origin);
  return {
    "@type": "WebSite",
    "@id": id,
    url: `${origin}/`,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    inLanguage: "sk-SK",
    publisher: { "@id": orgId },
  };
}

export function buildWebPage(input: {
  path: string;
  name: string;
  description?: string | null;
  type?: "WebPage" | "ContactPage" | "CollectionPage";
}, origin = getSiteOrigin()) {
  const pageUrl = absoluteUrl(input.path);
  const webId = websiteId(origin);
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    isPartOf: { "@id": webId },
    about: { "@id": organizationId(origin) },
    inLanguage: "sk-SK",
  };
}

export function buildBreadcrumbList(
  items: Array<{ name: string; path: string }>,
  origin = getSiteOrigin(),
) {
  const pageUrl = absoluteUrl(items[items.length - 1]?.path ?? "/");
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function buildNewsArticles(
  posts: Array<{ title: string; content: string; published_date: string | null; created_at: string }>,
  pagePath: string,
  origin = getSiteOrigin(),
) {
  const pageUrl = absoluteUrl(pagePath);
  return posts.slice(0, 20).map((post, index) => {
    const date = post.published_date || post.created_at;
    const text = stripHtml(post.content).slice(0, 300);
    return {
      "@type": "NewsArticle",
      "@id": `${pageUrl}#article-${index}`,
      headline: post.title,
      ...(text ? { description: text } : {}),
      datePublished: date,
      ...(date ? { dateModified: date } : {}),
      author: { "@id": organizationId(origin) },
      publisher: { "@id": organizationId(origin) },
      isPartOf: { "@id": `${pageUrl}#webpage` },
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      inLanguage: "sk-SK",
    };
  });
}

export function buildProfilePage(input: {
  path: string;
  name: string;
  description?: string | null;
}, origin = getSiteOrigin()) {
  const pageUrl = absoluteUrl(input.path);
  const webId = websiteId(origin);
  return {
    "@type": "ProfilePage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    isPartOf: { "@id": webId },
    mainEntity: { "@id": `${pageUrl}#animal` },
    inLanguage: "sk-SK",
  };
}

export function toJsonLdGraph(...nodes: Record<string, unknown>[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
