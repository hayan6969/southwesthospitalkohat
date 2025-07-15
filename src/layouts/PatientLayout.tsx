import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";

interface PatientLayoutProps {
  children: ReactNode;
}

const PatientLayout = ({ children }: PatientLayoutProps) => {
  const { profile, signOut } = useAuth();
  const { settings: hospitalSettings } = useHospitalSettings();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 truncate">
              {hospitalSettings?.logo_url ? (
                <img 
                  src={hospitalSettings.logo_url} 
                  alt="Hospital Logo" 
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0"
                />
              ) : (
                <span className="inline-block w-2 h-6 sm:h-8 bg-blue-500 rounded-full flex-shrink-0" />
              )}
              <span className="truncate">
                <span className="hidden sm:inline">{hospitalSettings?.hospital_name || "HIMS"} - Patient Portal</span>
                <span className="sm:hidden">{hospitalSettings?.hospital_name || "HIMS"}</span>
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate max-w-[150px] sm:max-w-none">{profile.first_name} {profile.last_name}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex-shrink-0">
                {profile.role}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2 text-xs sm:text-sm">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden">Out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="p-3 sm:p-6">
        {children}
      </main>
    </div>
  );
};

export default PatientLayout;