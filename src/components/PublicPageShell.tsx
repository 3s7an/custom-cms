import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import RightSidebar from "@/components/RightSidebar";
import Footer from "@/components/Footer";

type Props = {
  children: React.ReactNode;
  /** e.g. pt for pages that don't need double padding */
  mainClassName?: string;
};

const PublicPageShell = ({ children, mainClassName = "p-6" }: Props) => (
  <div className="min-h-screen">
    <div className="max-w-[1400px] mx-auto min-h-screen mt-[20px]">
      <div className="shadow-lg">
        <Header />
        <div className="bg-background min-w-0 pt-14 md:pt-16 lg:pt-0">
          <div className="flex min-w-0 max-w-full flex-col lg:flex-row lg:items-start">
            <div className="hidden lg:block w-full lg:w-[240px] flex-shrink-0">
              <Sidebar />
            </div>
            <div className={`flex-1 min-w-0 max-w-full ${mainClassName}`}>{children}</div>
            <div className="w-full min-w-0 max-w-full flex-shrink-0 p-3 lg:w-[240px] lg:border-l lg:border-border">
              <RightSidebar />
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  </div>
);

export default PublicPageShell;
