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
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {hospitalSettings?.logo_url ? (
                <img 
                  src={hospitalSettings.logo_url} 
                  alt="Hospital Logo" 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
              )}
              {hospitalSettings?.hospital_name || "HIMS"} - Patient Portal
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{profile.first_name} {profile.last_name}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {profile.role}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={signOut} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
};

export default PatientLayout;