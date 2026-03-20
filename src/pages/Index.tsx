import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UserAccountDialog from "@/components/UserAccountDialog";
import { User, LogOut } from "lucide-react";

const resolveDashboardRole = (role?: string) => {
  if (!role) return null;
  if (role.includes("pharmacist")) return "pharmacy";
  if (role === ("nursing" as any)) return "ota";
  return role;
};

const Index = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const dashboardRole = resolveDashboardRole(profile?.role);

  useEffect(() => {
    if (dashboardRole) {
      navigate(`/dashboard/${dashboardRole}`, { replace: true });
    }
  }, [dashboardRole, navigate]);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-16 w-16 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between border-b p-6">
        <div className="flex items-center gap-2">
          <span className="inline-block h-8 w-2 rounded-full bg-primary" />
          <h1 className="text-2xl font-bold text-primary">HIMS</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{profile.first_name} {profile.last_name}</span>
            <span className="rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
              {profile.role}
            </span>
          </div>

          <Button variant="outline" onClick={signOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-10">
        <div className="w-full max-w-2xl">
          <Card className="border border-muted shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="mb-2 text-3xl font-bold text-primary">
                Welcome to HIMS
              </CardTitle>
              <CardDescription className="text-lg">
                Hospital Information Management System
              </CardDescription>
              <div className="mt-4 rounded-lg bg-muted/50 p-4">
                <p className="font-medium text-foreground">
                  Welcome back, {profile.first_name}!
                </p>
                <p className="text-sm text-muted-foreground">
                  Role: {profile.role} | Email: {profile.email}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="text-center">
                <Button
                  onClick={() => dashboardRole && navigate(`/dashboard/${dashboardRole}`)}
                  className="px-8 py-3 text-lg"
                >
                  Go to My Dashboard
                </Button>
              </div>

              {profile.role === "admin" && (
                <div className="border-t pt-6">
                  <div className="space-y-4 text-center">
                    <h3 className="text-lg font-semibold">Admin Functions</h3>
                    <UserAccountDialog />
                  </div>
                </div>
              )}

              <div className="border-t pt-4 text-center text-sm text-muted-foreground">
                <p>Authenticated securely</p>
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
