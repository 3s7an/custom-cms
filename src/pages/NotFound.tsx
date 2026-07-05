import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PublicPageShell from "@/components/PublicPageShell";
import NotFoundContent from "@/components/NotFoundContent";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.title = "Stránka sa nenašla";
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PublicPageShell mainClassName="p-6">
      <NotFoundContent />
    </PublicPageShell>
  );
};

export default NotFound;
