
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Users, FileText, AlertCircle, Building2, Activity, Shield, User, LogOut, UserCheck, Eye, Edit } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { useUsers } from "@/hooks/useUsers";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useDoctors } from "@/hooks/useDoctors";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoctorDialog } from "@/components/dialogs/DoctorDialog";
import { StaffDialog } from "@/components/dialogs/StaffDialog";
import { DepartmentDialog } from "@/components/dialogs/DepartmentDialog";
import { format } from "date-fns";

export default function DashboardAdmin() {
  const { profile, signOut } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();
  const { data: doctors, isLoading: doctorsLoading } = useDoctors();
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

          <TabsContent value="doctors" className="space-y-8 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Doctor Management</h2>
                <p className="text-gray-600 mt-1">Manage doctor profiles and specializations</p>
              </div>
              <DoctorDialog />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Doctor Registry
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>License Number</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : doctors && doctors.length > 0 ? (
                      doctors.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell>
                            <div className="font-medium">
                              Dr. {doctor.user?.first_name} {doctor.user?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doctor.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                              {doctor.specialization || 'General'}
                            </span>
                          </TableCell>
                          <TableCell>{doctor.experience_years || 0} years</TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">
                              {doctor.license_number || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>{doctor.user?.phone || 'N/A'}</TableCell>
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
                          No doctors found
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

          <TabsContent value="departments" className="space-y-8 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Department Management</h2>
                <p className="text-gray-600 mt-1">Manage hospital departments and organization</p>
              </div>
              <DepartmentDialog />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Departments
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentsLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 4 }).map((_, j) => (
                            <TableCell key={j}>
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : departments && departments.length > 0 ? (
                      departments.map((department) => (
                        <TableRow key={department.id}>
                          <TableCell>
                            <div className="font-medium">
                              {department.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {department.description || 'No description'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {department.created_at ? format(new Date(department.created_at), 'MMM d, yyyy') : 'N/A'}
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
                        <TableCell colSpan={4} className="text-center text-gray-500 py-12">
                          No departments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-8 mt-6">
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
        </Tabs>
      </div>
    </div>
  );
}
