import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import NewsContent from "@/components/NewsContent";
import RightSidebar from "@/components/RightSidebar";
import Footer from "@/components/Footer";
import StructuredData from "@/components/StructuredData";
import { useOrganizationSchema } from "@/hooks/useOrganizationSchema";
import { buildWebPage, toJsonLdGraph } from "@/lib/structuredData";
import { useEffect, useMemo } from "react";
import { useSiteIdentity } from "@/context/siteIdentity";

const Index = () => {
  const { identity } = useSiteIdentity();
  const { organization, website, orgName } = useOrganizationSchema();

  const structuredData = useMemo(() => {
    const home = buildWebPage({
      path: "/",
      name: orgName,
      description: identity?.tagline || undefined,
    });
    return toJsonLdGraph(organization, website, home);
  }, [organization, website, orgName, identity?.tagline]);

  useEffect(() => {
    if (identity?.siteTitle) document.title = identity.siteTitle;
    const desc = (identity?.tagline || "").trim();
    if (desc) {
      const el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (el) el.content = desc;
    }
  }, [identity?.siteTitle, identity?.tagline]);

  return (
    <>
      <StructuredData data={structuredData} />
      <div className="min-h-screen">
        <div className="max-w-[1400px] mx-auto min-h-screen mt-[20px]">
          <div className="shadow-lg">
            <Header />
            <div className="bg-background min-w-0 pt-14 md:pt-16 lg:pt-0">
              <div className="flex min-w-0 max-w-full flex-col lg:flex-row">
                <div className="hidden lg:block w-full lg:w-[240px] flex-shrink-0">
                  <Sidebar />
                </div>
                <div className="min-w-0 max-w-full flex-1 border-x border-border">
                  <NewsContent />
                </div>
                <div className="w-full min-w-0 max-w-full flex-shrink-0 p-3 lg:w-[240px]">
                  <RightSidebar />
                </div>
              </div>
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
