
import { ReactNode } from "react";
import { SidebarNav } from "@/components/SidebarNav";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";


interface AppLayoutProps {
  children: ReactNode;
  sidebarRole?: string;
  hideSidebar?: boolean;
}

const AppLayout = ({ children, sidebarRole, hideSidebar }: AppLayoutProps) => {
  const { profile, signOut } = useAuth();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {!hideSidebar && <SidebarNav role={sidebarRole || profile.role} />}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 sm:gap-6 ml-10 md:ml-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="inline-block w-2 h-6 sm:h-8 bg-blue-500 rounded-full" />
                HIMS
              </h1>
              {profile.role === 'admin' && (
                <div className="hidden lg:block">
                  <AdminDashboardNav />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{profile.first_name} {profile.last_name}</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {profile.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
          {/* Mobile admin nav */}
          {profile.role === 'admin' && (
            <div className="lg:hidden mt-3 overflow-x-auto -mx-4 px-4">
              <AdminDashboardNav />
            </div>
          )}
        </header>
        <main className="flex-1 p-3 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
