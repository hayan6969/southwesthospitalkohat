
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserAccountDialog from "@/components/UserAccountDialog";
import { User, LogOut } from "lucide-react";

const Index = () => {
  const { user, profile, signOut } = useAuth();

  useEffect(() => {
    // Check for offline mode first
    if (!navigator.onLine) {
      const cachedSession = localStorage.getItem('cached_session');
      const cachedProfile = cachedSession ? 
        localStorage.getItem(`profile_${JSON.parse(cachedSession).user.id}`) : null;
      
      if (cachedProfile) {
        const parsedProfile = JSON.parse(cachedProfile);
        console.log('🔍 Offline mode detected with cached profile:', parsedProfile.role);
        
        // Only redirect to offline mode for staff
        if (parsedProfile.role === 'staff') {
          console.log('📱 Redirecting to offline mode for staff');
          window.location.href = '/offline-mode';
          return;
        }
      }
    }

    // Normal online redirect logic
    console.log('Index.tsx - Current profile:', profile);
    console.log('Index.tsx - Profile role:', profile?.role);
    if (profile?.role) {
      console.log('Redirecting to dashboard for role:', profile.role);
      console.log('Redirect URL:', `/dashboard/${profile.role}`);
      window.location.href = `/dashboard/${profile.role}`;
    } else {
      console.log('No profile role found, staying on Index');
    }
  }, [profile]);

  // Show loading while checking for profile
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-between items-center p-6 border-b">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
          <h1 className="text-2xl font-bold text-primary">HIMS</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {profile && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{profile.first_name} {profile.last_name}</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {profile.role}
              </span>
            </div>
          )}
          
          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-10">
        <div className="w-full max-w-2xl">
          <Card className="shadow-xl border border-muted">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-primary mb-2">
                Welcome to HIMS
              </CardTitle>
              <CardDescription className="text-lg">
                Hospital Information Management System
              </CardDescription>
              {profile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 font-medium">
                    Welcome back, {profile.first_name}!
                  </p>
                  <p className="text-blue-600 text-sm">
                    Role: {profile.role} | Email: {profile.email}
                  </p>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button 
                  onClick={() => window.location.href = `/dashboard/${profile.role}`}
                  className="text-lg px-8 py-3"
                >
                  Go to My Dashboard
                </Button>
              </div>
              
              {profile?.role === 'admin' && (
                <div className="border-t pt-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Admin Functions</h3>
                    <UserAccountDialog />
                  </div>
                </div>
              )}
              
              <div className="text-center text-sm text-gray-600 border-t pt-4">
                <p>Authenticated with Supabase</p>
                <p>Role-based access control enabled</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
