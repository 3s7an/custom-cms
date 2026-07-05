import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import PageView from "./pages/PageView.tsx";
import LeonbergerDetail from "./pages/LeonbergerDetail.tsx";
import { SiteIdentityProvider } from "@/context/siteIdentity";
import CookieBanner from "@/components/CookieBanner";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteIdentityProvider>
          <AuthProvider>
            <CookieBanner />
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/leonberger/:slug" element={<LeonbergerDetail />} />
              <Route path="/:slug" element={<PageView />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </SiteIdentityProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
