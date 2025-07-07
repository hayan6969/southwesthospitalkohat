
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Users, FileText, AlertCircle, Building2, Activity, Shield, User, LogOut } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useUsers } from "@/hooks/useUsers";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDoctors from "./admin/AdminDoctors";
import AdminStaff from "./admin/AdminStaff";
import AdminDepartments from "./admin/AdminDepartments";
import AdminAuditLogs from "./admin/AdminAuditLogs";

export default function DashboardAdmin() {
  const { profile, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with user info and sign out */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="inline-block w-2 h-8 bg-blue-500 rounded-full" />
              HIMS - Admin Dashboard
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

      {/* Main content with tabs */}
      <div className="p-6">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="doctors">Doctors</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-8 mt-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">System Overview</h2>
              <p className="text-gray-600 mt-1">Monitor system performance and user activity</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Doctors"
                value={stats?.totalDoctors || 0}
                icon={<Users className="w-5 h-5 text-blue-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Total Patients"
                value={stats?.totalPatients || 0}
                icon={<FileText className="w-5 h-5 text-green-600" />}
                loading={statsLoading}
              />
              <StatsCard
                title="Total Staff"
                value={users?.filter(u => u.role === 'staff').length || 0}
                icon={<Building2 className="w-5 h-5 text-purple-600" />}
                loading={usersLoading}
              />
              <StatsCard
                title="System Alerts"
                value="3"
                icon={<AlertCircle className="w-5 h-5 text-red-600" />}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  System Activity
                </h3>
                <DemoTable
                  columns={["Action", "User", "Time"]}
                  data={[
                    ["User Login", "Dr. Smith", "10:30 AM"],
                    ["Patient Added", "Admin", "10:15 AM"],
                    ["Report Generated", "Dr. Jones", "09:45 AM"],
                    ["System Backup", "System", "09:00 AM"],
                  ]}
                />
              </div>
              
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Security Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Sessions</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Failed Logins (24h)</span>
                    <span className="font-medium text-red-600">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Backup</span>
                    <span className="font-medium text-green-600">2 hours ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">System Status</span>
                    <span className="font-medium text-green-600">Healthy</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <AuditLog 
                title="Recent System Events"
                events={auditLogs?.slice(0, 10).map(log => ({
                  who: log.user?.first_name + ' ' + log.user?.last_name || 'System',
                  when: log.created_at || '',
                  what: log.action,
                  details: log.details || ''
                })) || []} 
              />
            </div>
          </TabsContent>

          <TabsContent value="doctors" className="mt-6">
            <AdminDoctors />
          </TabsContent>

          <TabsContent value="staff" className="mt-6">
            <AdminStaff />
          </TabsContent>

          <TabsContent value="departments" className="mt-6">
            <AdminDepartments />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <AdminAuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
