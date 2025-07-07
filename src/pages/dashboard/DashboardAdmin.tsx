
import { useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { AppointmentChart } from "@/components/AppointmentChart";
import { MiniChart } from "@/components/MiniChart";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { PharmacyOverview } from "@/components/PharmacyOverview";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { useStats, useUsers, useDepartments, useAuditLogs } from "@/hooks/useDatabase";
import { Users, UserCheck, Calendar, DollarSign, Shield, Activity, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountManagementDialog } from "@/components/dialogs/AccountManagementDialog";
import { EditUserDialog } from "@/components/dialogs/EditUserDialog";
import { format } from "date-fns";
import { formatPkrCurrency } from "@/utils/currency";

const chartData = {
  doctors: [{ value: 180 }, { value: 200 }, { value: 247 }, { value: 230 }, { value: 247 }],
  patients: [{ value: 3800 }, { value: 4000 }, { value: 4178 }, { value: 4100 }, { value: 4178 }],
  appointments: [{ value: 11000 }, { value: 11500 }, { value: 12178 }, { value: 12000 }, { value: 12178 }],
  revenue: [{ value: 48000 }, { value: 52000 }, { value: 55240 }, { value: 54000 }, { value: 55240 }],
};

export default function DashboardAdmin() {
  const { data: stats, isLoading } = useStats();
  const { data: users, refetch: refetchUsers } = useUsers();
  const { data: departments } = useDepartments();
  const { data: auditLogs } = useAuditLogs();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Account management filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // System logs filters
  const [actionFilter, setActionFilter] = useState("all");
  const [logSearchTerm, setLogSearchTerm] = useState("");

  // Filter users based on role and search term
  const filteredUsers = users?.filter(user => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesSearch = searchTerm === "" || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  }) || [];

  // Filter audit logs
  const filteredLogs = auditLogs?.filter(log => {
    const matchesAction = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesSearch = logSearchTerm === "" || 
      log.action.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(logSearchTerm.toLowerCase()));
    return matchesAction && matchesSearch;
  }) || [];

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleUserUpdated = () => {
    refetchUsers();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-green-100 text-green-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      case 'pharmacy': return 'bg-orange-100 text-orange-700';
      case 'finance': return 'bg-teal-100 text-teal-700';
      case 'patient': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <div className="flex gap-3">
            <AppointmentDialog />
            <Button variant="outline">Schedule Availability</Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="accounts">Account Management</TabsTrigger>
            <TabsTrigger value="pharmacy">Pharmacy</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Doctors"
                value={stats?.totalDoctors?.toString() || "0"}
                change="+5%"
                changeType="positive"
                icon={<UserCheck className="w-5 h-5 text-blue-600" />}
                chart={<MiniChart data={chartData.doctors} type="bar" color="#3b82f6" />}
                loading={isLoading}
              />
              <StatsCard
                title="Patients"
                value={stats?.totalPatients?.toString() || "0"}
                change="+25%"
                changeType="positive"
                icon={<Users className="w-5 h-5 text-orange-600" />}
                chart={<MiniChart data={chartData.patients} type="area" color="#f97316" />}
                loading={isLoading}
              />
              <StatsCard
                title="Appointments"
                value={stats?.totalAppointments?.toString() || "0"}
                change="-5%"
                changeType="negative"
                icon={<Calendar className="w-5 h-5 text-red-600" />}
                chart={<MiniChart data={chartData.appointments} type="bar" color="#ef4444" />}
                loading={isLoading}
              />
              <StatsCard
                title="Revenue"
                value={formatPkrCurrency(stats?.totalRevenue || 0)}
                change="+23%"
                changeType="positive"
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                chart={<MiniChart data={chartData.revenue} type="line" color="#10b981" />}
                loading={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
              <div className="xl:col-span-2">
                <AppointmentChart />
              </div>
              <div>
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="font-semibold mb-4">Popular Doctors</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Dr. Alex Morgan</p>
                        <p className="text-sm text-muted-foreground">Cardiologist</p>
                      </div>
                      <span className="text-sm font-medium">98%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Dr. Emily Carter</p>
                        <p className="text-sm text-muted-foreground">Pediatrician</p>
                      </div>
                      <span className="text-sm font-medium">95%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Dr. David Lee</p>
                        <p className="text-sm text-muted-foreground">Neurologist</p>
                      </div>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4">Recent Staff Activity</h3>
                <DemoTable
                  columns={["Staff Member", "Department", "Last Activity"]}
                  data={[
                    ["Amy Taylor", "Reception", "2 hours ago"],
                    ["Tom Chan", "Laboratory", "4 hours ago"],
                    ["Alice Smith", "General Medicine", "1 hour ago"],
                  ]}
                />
              </div>
              <div>
                <AuditLog events={filteredLogs.slice(0, 5).map(log => ({
                  who: log.user?.first_name && log.user?.last_name 
                    ? `${log.user.first_name} ${log.user.last_name}` 
                    : log.user?.email || 'System',
                  when: format(new Date(log.created_at || ''), 'yyyy-MM-dd HH:mm'),
                  what: log.action,
                  details: log.details || ''
                }))} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title="Total Users"
                value={users?.length?.toString() || "0"}
                change="+12%"
                changeType="positive"
                icon={<Users className="w-5 h-5 text-blue-600" />}
                chart={<MiniChart data={chartData.doctors} type="bar" color="#3b82f6" />}
              />
              <StatsCard
                title="Active Sessions"
                value="45"
                change="+8%"
                changeType="positive"
                icon={<Activity className="w-5 h-5 text-green-600" />}
                chart={<MiniChart data={chartData.patients} type="area" color="#10b981" />}
              />
              <StatsCard
                title="System Uptime"
                value="99.9%"
                change="0%"
                changeType="neutral"
                icon={<Shield className="w-5 h-5 text-purple-600" />}
                chart={<MiniChart data={chartData.appointments} type="line" color="#8b5cf6" />}
              />
              <StatsCard
                title="Daily Transactions"
                value="1,234"
                change="+18%"
                changeType="positive"
                icon={<DollarSign className="w-5 h-5 text-orange-600" />}
                chart={<MiniChart data={chartData.revenue} type="bar" color="#f97316" />}
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <AppointmentChart />
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="font-semibold mb-4">User Role Distribution</h3>
                <div className="space-y-3">
                  {['doctor', 'staff', 'pharmacy', 'finance', 'admin'].map(role => {
                    const count = users?.filter(u => u.role === role).length || 0;
                    const percentage = users?.length ? Math.round((count / users.length) * 100) : 0;
                    return (
                      <div key={role} className="flex items-center justify-between">
                        <span className="capitalize font-medium">{role}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{count} ({percentage}%)</span>
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-blue-500 rounded" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="accounts">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Account Management</h3>
                  <p className="text-gray-600">Manage all user accounts across the system</p>
                </div>
                <AccountManagementDialog />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="pharmacy">Pharmacy</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="patient">Patient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Join Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            {departments?.find(dept => dept.id === user.department_id)?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEditUser(user)}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant={user.is_active ? "destructive" : "default"}
                              >
                                {user.is_active ? 'Block' : 'Unblock'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pharmacy">
            <PharmacyOverview />
          </TabsContent>

          <TabsContent value="logs">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">System Logs</h3>
                  <p className="text-gray-600">Monitor critical system activities and user actions</p>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium">Security Monitoring</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <Input
                      placeholder="Search logs..."
                      value={logSearchTerm}
                      onChange={(e) => setLogSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Actions</SelectItem>
                      <SelectItem value="login">Login</SelectItem>
                      <SelectItem value="logout">Logout</SelectItem>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            {format(new Date(log.created_at || ''), 'MMM dd, yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {log.user?.first_name && log.user?.last_name 
                              ? `${log.user.first_name} ${log.user.last_name}` 
                              : log.user?.email || 'System'}
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                              {log.action}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.details || 'No details'}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || 'Unknown'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <EditUserDialog 
          user={editingUser}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    </div>
  );
}
