import AppLayout from "@/layouts/AppLayout";
import { IPDAdminPanel } from "@/components/ipd/IPDAdminPanel";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardIpd() {
  const { profile } = useAuth();

  return (
    <AppLayout sidebarRole="ipd">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-blue-500 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">IPD Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.first_name} {profile?.last_name} — IPD Staff
            </p>
          </div>
        </div>
        <IPDAdminPanel />
      </div>
    </AppLayout>
  );
}