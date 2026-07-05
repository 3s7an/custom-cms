import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut } from "lucide-react";
import SectionsManager from "@/components/admin/SectionsManager";
import PagesManager from "@/components/admin/PagesManager";
import PostsManager from "@/components/admin/PostsManager";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import SiteAssetsManager from "@/components/admin/SiteAssetsManager";

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  // Po prvom úspešnom overení admina už nezhadzujeme celý panel pri krátkych `authLoading` preklopeniach
  // (napr. po návrate focusu), inak sa remountne UI a zresetuje rozpracovaný stav formulárov/tabov.
  const [adminGatePassed, setAdminGatePassed] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !isAdmin) {
      setAdminGatePassed(false);
      navigate("/admin/login", { replace: true });
      return;
    }

    setAdminGatePassed(true);
  }, [user, isAdmin, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!adminGatePassed) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1400px] mx-auto min-h-screen mt-[20px]">
          <div className="shadow-lg bg-background min-h-[calc(100vh-20px)] flex items-center justify-center">
            <p className="text-foreground">Načítavam...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto min-h-screen mt-[20px]">
        <div className="shadow-lg bg-background min-h-[calc(100vh-20px)]">
          <div className="max-w-[1100px] mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-heading text-2xl font-bold text-foreground">
                Admin panel
              </h1>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/")}>Na web</Button>
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1" /> Odhlásiť
                </Button>
              </div>
            </div>

            <Tabs defaultValue="posts">
              <TabsList className="mb-4">
                <TabsTrigger value="posts">Príspevky</TabsTrigger>
                <TabsTrigger value="pages">Stránky</TabsTrigger>
                <TabsTrigger value="sections">Sekcie</TabsTrigger>
                <TabsTrigger value="announcements">Oznamy</TabsTrigger>
                <TabsTrigger value="site">Nastavenia</TabsTrigger>
              </TabsList>
              <TabsContent value="posts"><PostsManager /></TabsContent>
              <TabsContent value="pages"><PagesManager /></TabsContent>
              <TabsContent value="sections"><SectionsManager /></TabsContent>
              <TabsContent value="announcements"><AnnouncementsManager /></TabsContent>
              <TabsContent value="site"><SiteAssetsManager /></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
