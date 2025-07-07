import { StatsCard } from "@/components/StatsCard";
import { PharmacyOverview } from "@/components/PharmacyOverview";
import { AuditLog } from "@/components/AuditLog";
import { MiniChart } from "@/components/MiniChart";
import { Users, FileText, AlertCircle, Building2, Activity, Shield, User, LogOut, UserCheck, Eye, Edit, BarChart3, TrendingUp, Package } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useUsers } from "@/hooks/useUsers";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffDialog } from "@/components/dialogs/StaffDialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";

export default function DashboardAdmin() {
  const { profile, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: departments, isLoading: departmentsLoading } = useDepartments();

  const staffMembers = users?.filter(user => user.role === 'staff') || [];

  const getDepartmentName = (departmentId: string | null | undefined) => {
    if (!departmentId) return 'Unassigned';
    const department = departments?.find(d => d.id === departmentId);
    return department?.name || 'Unknown';
  };

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
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy Overview</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
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
                title="Total Revenue"
                value={`₨${analytics?.totalRevenue || 0}`}
                icon={<BarChart3 className="w-5 h-5 text-green-600" />}
                loading={analyticsLoading}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Recent System Events
                </h3>
                <AuditLog 
                  title=""
                  events={auditLogs?.slice(0, 5).map(log => ({
                    who: log.user?.first_name + ' ' + log.user?.last_name || 'System',
                    when: log.created_at || '',
                    what: log.action,
                    details: log.details || ''
                  })) || []} 
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-8 mt-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
              <p className="text-gray-600 mt-1">Detailed insights and trends from the last 30 days</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total Appointments"
                value={analytics?.totalAppointments || 0}
                icon={<Activity className="w-5 h-5 text-blue-600" />}
                loading={analyticsLoading}
                chart={
                  <MiniChart 
                    data={analytics?.appointmentTrends?.slice(-7).map(d => ({ value: d.appointments })) || []}
                    type="line"
                    color="#3b82f6"
                  />
                }
              />
              <StatsCard
                title="New Users"
                value={analytics?.totalUsers || 0}
                icon={<Users className="w-5 h-5 text-green-600" />}
                loading={analyticsLoading}
                chart={
                  <MiniChart 
                    data={analytics?.userTrends?.slice(-7).map(d => ({ value: d.total })) || []}
                    type="area"
                    color="#10b981"
                  />
                }
              />
              <StatsCard
                title="Revenue Growth"
                value={`₨${analytics?.totalRevenue || 0}`}
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                loading={analyticsLoading}
                chart={
                  <MiniChart 
                    data={analytics?.revenueTrends?.slice(-7).map(d => ({ value: d.total })) || []}
                    type="bar"
                    color="#8b5cf6"
                  />
                }
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Appointment Trends (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics?.appointmentTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="appointments" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Revenue Trends (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics?.revenueTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                        formatter={(value) => [`₨${value}`, 'Revenue']}
                      />
                      <Bar dataKey="hospital" fill="#3b82f6" name="Hospital" />
                      <Bar dataKey="pharmacy" fill="#10b981" name="Pharmacy" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Department Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(analytics?.departmentStats || {}).map(([name, value]) => ({
                        name,
                        value
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {Object.entries(analytics?.departmentStats || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pharmacy" className="space-y-8 mt-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pharmacy Overview</h2>
              <p className="text-gray-600 mt-1">Medicine inventory and pharmacy performance</p>
            </div>

            <PharmacyOverview />
          </TabsContent>

          <TabsContent value="logs" className="space-y-8 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Audit Logs</h2>
                <p className="text-gray-600 mt-1">System activity and security monitoring</p>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <FileText className="w-4 h-4 mr-2" />
                Export Logs
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  System Activity Log
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLoading ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : auditLogs && auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="font-medium">
                              {log.user?.first_name} {log.user?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {log.details || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {log.ip_address || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-8 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Staff Management</h2>
                <p className="text-gray-600 mt-1">Manage hospital staff and assignments</p>
              </div>
              <StaffDialog />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Staff Directory
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Join Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : staffMembers && staffMembers.length > 0 ? (
                      staffMembers.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell>
                            <div className="font-medium">
                              {staff.first_name} {staff.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {staff.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                              {getDepartmentName(staff.department_id)}
                            </span>
                          </TableCell>
                          <TableCell>{staff.phone || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              staff.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {staff.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {staff.created_at ? format(new Date(staff.created_at), 'MMM d, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                          No staff members found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}