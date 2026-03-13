import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { StatsCard } from "@/components/StatsCard";
import { RealAppointmentChart } from "@/components/RealAppointmentChart";
import { PopularDoctorsWidget } from "@/components/PopularDoctorsWidget";
import { MiniChart } from "@/components/MiniChart";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { PharmacyOverview } from "@/components/PharmacyOverview";
import { AppointmentDialog } from "@/components/dialogs/AppointmentDialog";
import { useUsers, useDepartments, useAuditLogs, useUpdateUserStatus, useDeleteUser } from "@/hooks/useDatabase";
import { useRealStatsData } from "@/hooks/useRealStatsData";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { useFinancialAnalytics } from "@/hooks/useFinancialAnalytics";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserCheck, Calendar, Banknote, Shield, Activity, Filter, User, LogOut, TrendingUp, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountManagementDialog } from "@/components/dialogs/AccountManagementDialog";
import { EditUserDialog } from "@/components/dialogs/EditUserDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import AdminLabs from "./admin/AdminLabs";
import { AdminOT } from "./admin/AdminOT";
import AdminXrays from "./admin/AdminXrays";
import { AdminFinanceAnalytics } from "@/components/AdminFinanceAnalytics";
import { EmergencyExpensesManager } from "@/components/admin/EmergencyExpensesManager";
import { AuditLogDetailDialog } from "@/components/dialogs/AuditLogDetailDialog";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";


export default function DashboardAdmin() {
  const { profile, signOut } = useAuth();
  const { data: realStats, isLoading } = useRealStatsData();
  const { data: users, refetch: refetchUsers } = useUsers();
  const { data: departments } = useDepartments();
  const { data: auditLogs } = useAuditLogs();
  const { data: recentActivity } = useRecentActivity();
  const { data: financialAnalytics } = useFinancialAnalytics();
  const { settings: hospitalSettings, updateSettings } = useHospitalSettings();
  const { toast: toastHook } = useToast();
  const updateUserStatus = useUpdateUserStatus();
  const deleteUser = useDeleteUser();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Settings form state
  const [brandingForm, setBrandingForm] = useState({
    hospital_name: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [timingsForm, setTimingsForm] = useState({
    opening_time: '',
    closing_time: '',
    working_days: [] as string[],
    payroll_payment_date: 1,
    emergency_consultation_fee: 10000
  });
  const [hospitalForm, setHospitalForm] = useState({
    hospital_name: '',
    contact_number: '',
    hospital_address: ''
  });
  
  // Account management filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  
  // System logs filters
  const [actionFilter, setActionFilter] = useState("all");
  const [logSearchTerm, setLogSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // System logs dialog state
  const [selectedSystemLog, setSelectedSystemLog] = useState<any>(null);
  const [showSystemLogDetail, setShowSystemLogDetail] = useState(false);

  // Filter users based on role and search term
  const filteredUsers = users?.filter(user => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesSearch = searchTerm === "" || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  }) || [];

  // Pagination for users
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filter audit logs
  const filteredLogs = auditLogs?.filter(log => {
    const action = (log.action || '').toLowerCase();
    const details = (log.details || '').toLowerCase();

    // Improved action filtering with specific expense matching (action or details)
    const matchesAction = actionFilter === "all" || 
      (actionFilter === "expense"
        ? (
            action.includes("expense") ||
            details.includes("expense") ||
            details.includes("withdrawal") ||
            details.includes("bill payment") ||
            details.includes("pharmacy expense")
          )
        : action.includes(actionFilter.toLowerCase())
      );
    
    const matchesSearch = logSearchTerm === "" || 
      action.includes(logSearchTerm.toLowerCase()) ||
      details.includes(logSearchTerm.toLowerCase());
    
    // Date filtering
    const logDate = new Date(log.created_at || '');
    const matchesDateFrom = dateFrom === "" || logDate >= new Date(dateFrom);
    const matchesDateTo = dateTo === "" || logDate <= new Date(dateTo + 'T23:59:59');
    
    return matchesAction && matchesSearch && matchesDateFrom && matchesDateTo;
  }) || [];

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleUserUpdated = () => {
    refetchUsers();
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = !user.is_active;
    const action = newStatus ? "unblocked" : "blocked";
    
    try {
      await updateUserStatus.mutateAsync({ 
        userId: user.id, 
        isActive: newStatus 
      });
      toast.success(`User ${action} successfully`);
      // Force refetch to update UI
      await refetchUsers();
    } catch (error) {
      console.error(`Failed to ${action.toLowerCase()} user:`, error);
      toast.error(`Failed to ${action.toLowerCase()} user`);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.role === 'admin') {
      toast.error("Cannot delete admin users");
      return;
    }
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast.success("User deleted successfully");
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      await refetchUsers();
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleSystemLogClick = (log: any) => {
    console.log("System log clicked:", log);
    setSelectedSystemLog(log);
    setShowSystemLogDetail(true);
  };

  // Initialize forms when hospital settings load
  useEffect(() => {
    if (hospitalSettings) {
      setBrandingForm({
        hospital_name: hospitalSettings.hospital_name || '',
        logo_url: hospitalSettings.logo_url || ''
      });
      setTimingsForm(prev => ({
        ...prev,
        emergency_consultation_fee: hospitalSettings.emergency_consultation_fee || 10000
      }));
      setHospitalForm({
        hospital_name: hospitalSettings.hospital_name || '',
        contact_number: hospitalSettings.contact_number || '',
        hospital_address: hospitalSettings.hospital_address || ''
      });
    }
  }, [hospitalSettings]);

  const handleSaveBranding = async () => {
    const updates: any = { hospital_name: brandingForm.hospital_name };
    
    // Upload logo if a new file was selected
    if (logoFile) {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('hospital-logos')
        .upload(fileName, logoFile);
      
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('hospital-logos')
          .getPublicUrl(fileName);
        
        updates.logo_url = publicUrl;
      }
    }
    
    const success = await updateSettings(updates);
    if (success) {
      setLogoFile(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-green-100 text-green-700';
      case 'staff': return 'bg-blue-100 text-blue-700';
      case 'ota': return 'bg-indigo-100 text-indigo-700';
      case 'nursing': return 'bg-pink-100 text-pink-700';
      case 'head_pharmacist': return 'bg-orange-100 text-orange-700';
      case 'assistant_pharmacist': return 'bg-orange-50 text-orange-600';
      case 'salesman_pharmacist': return 'bg-orange-200 text-orange-800';
      case 'finance': return 'bg-teal-100 text-teal-700';
      case 'patient': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Profile - Compact */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {hospitalSettings?.logo_url ? (
                <img 
                  src={hospitalSettings.logo_url} 
                  alt="Hospital Logo" 
                  className="w-6 h-6 object-contain"
                />
              ) : (
                <span className="inline-block w-2 h-6 bg-blue-500 rounded-full" />
              )}
              {hospitalSettings?.hospital_name || "HIMS"}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Hospital Information Management System</p>
          </div>
          
          {/* Profile Section - Compact */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-purple-200">
                <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </span>
                <span className="text-xs text-gray-600">{profile?.email}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                  Administrator
                </span>
                <span className="text-xs text-gray-500">System Admin</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={signOut} 
              className="flex items-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 text-xs"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">System Overview</h2>
            <AdminDashboardNav />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full h-auto p-1 gap-0">
                <TabsTrigger value="overview" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Overview</TabsTrigger>
                <TabsTrigger value="analytics" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Analytics</TabsTrigger>
                <TabsTrigger value="accounts" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Account Management</TabsTrigger>
                <TabsTrigger value="pharmacy" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Pharmacy</TabsTrigger>
                <TabsTrigger value="lab" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Lab</TabsTrigger>
                <TabsTrigger value="xray" className="whitespace-nowrap px-4 py-2 text-sm flex-1">X-ray</TabsTrigger>
                <TabsTrigger value="ot" className="whitespace-nowrap px-4 py-2 text-sm flex-1">OT</TabsTrigger>
                <TabsTrigger value="emergency" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Emergency</TabsTrigger>
                <TabsTrigger value="logs" className="whitespace-nowrap px-4 py-2 text-sm flex-1">System Logs</TabsTrigger>
                <TabsTrigger value="settings" className="whitespace-nowrap px-4 py-2 text-sm flex-1">Settings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards - 2x2 Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatsCard
                  title="Doctors"
                  value={realStats?.totalDoctors?.toString() || "0"}
                  change={realStats?.doctorsChange}
                  changeType={realStats?.doctorsChangeType}
                  icon={<UserCheck className="w-5 h-5 text-blue-600" />}
                  chart={<MiniChart data={realStats?.chartData?.doctors || []} type="bar" color="#3b82f6" />}
                  loading={isLoading}
                />
                <StatsCard
                  title="Patients"
                  value={realStats?.totalPatients?.toString() || "0"}
                  change={realStats?.patientsChange}
                  changeType={realStats?.patientsChangeType}
                  icon={<Users className="w-5 h-5 text-orange-600" />}
                  chart={<MiniChart data={realStats?.chartData?.patients || []} type="area" color="#f97316" />}
                  loading={isLoading}
                />
                <StatsCard
                  title="Appointments"
                  value={realStats?.totalAppointments?.toString() || "0"}
                  change={realStats?.appointmentsChange}
                  changeType={realStats?.appointmentsChangeType}
                  icon={<Calendar className="w-5 h-5 text-red-600" />}
                  chart={<MiniChart data={realStats?.chartData?.appointments || []} type="bar" color="#ef4444" />}
                  loading={isLoading}
                />
                <StatsCard
                  title="Revenue"
                  value={formatPkrAmount(realStats?.totalRevenue || 0)}
                  change={realStats?.revenueChange}
                  changeType={realStats?.revenueChangeType}
                  icon={<Banknote className="w-5 h-5 text-green-600" />}
                  chart={<MiniChart data={realStats?.chartData?.revenue || []} type="line" color="#10b981" />}
                  loading={isLoading}
                />
              </div>

              {/* Main Dashboard Content - Clean 2 Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                
                {/* Appointment Chart - Left Column */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 lg:p-6 border-b border-gray-100">
                    <h3 className="font-semibold text-lg text-gray-900">Appointment Analytics</h3>
                    <p className="text-sm text-gray-600">Monthly appointment trends and patterns</p>
                  </div>
                  <div className="p-4 lg:p-6">
                    <RealAppointmentChart />
                  </div>
                </div>

                {/* Popular Doctors - Right Column */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 lg:p-6 border-b border-gray-100">
                    <h3 className="font-semibold text-lg text-gray-900">Popular Doctors</h3>
                    <p className="text-sm text-gray-600">Most booked this month</p>
                  </div>
                  <div className="p-4 lg:p-6">
                    <PopularDoctorsWidget />
                  </div>
                </div>
              </div>

              {/* System Logs - Full Width */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 lg:p-6 border-b border-gray-100">
                  <h3 className="font-semibold text-lg text-gray-900">System Activity Log</h3>
                  <p className="text-sm text-gray-600">Security and system events</p>
                </div>
                <div className="p-4 lg:p-6">
                  <AuditLog events={filteredLogs.slice(0, 8).map(log => ({
                    who: log.user_profile ? `${log.user_profile.first_name} ${log.user_profile.last_name} (${log.user_profile.email})` : (log.user_id ? `User ID: ${log.user_id}` : 'System'),
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
                  title="Hospital Revenue"
                  value={formatPkrAmount(financialAnalytics?.hospitalRevenue || 0)}
                  change={realStats?.revenueChange}
                  changeType={realStats?.revenueChangeType}
                  icon={<Banknote className="w-5 h-5 text-green-600" />}
                  chart={<MiniChart data={[{value: financialAnalytics?.hospitalRevenue || 0}]} type="bar" color="#10b981" />}
                />
                <StatsCard
                  title="Hospital Profit"
                  value={formatPkrAmount(financialAnalytics?.hospitalProfitWithPharmacy || 0)}
                  change="With Pharmacy"
                  changeType={financialAnalytics?.hospitalProfitWithPharmacy && financialAnalytics.hospitalProfitWithPharmacy > 0 ? "positive" : "negative"}
                  icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                  chart={<MiniChart data={[{value: Math.max(0, (financialAnalytics?.hospitalProfitWithPharmacy || 0))}]} type="area" color="#3b82f6" />}
                />
                <StatsCard
                  title="Total Expenses"
                  value={formatPkrAmount(financialAnalytics?.totalExpenses || 0)}
                  change="Monthly"
                  changeType="negative"
                  icon={<CreditCard className="w-5 h-5 text-red-600" />}
                  chart={<MiniChart data={[{value: financialAnalytics?.totalExpenses || 0}]} type="bar" color="#ef4444" />}
                />
                <StatsCard
                  title="Active Users"
                  value={users?.length?.toString() || "0"}
                  change={realStats?.patientsChange}
                  changeType={realStats?.patientsChangeType}
                  icon={<Users className="w-5 h-5 text-purple-600" />}
                  chart={<MiniChart data={realStats?.chartData?.patients || []} type="line" color="#8b5cf6" />}
                />
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                <RealAppointmentChart />
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="font-semibold mb-4">Revenue by Source</h3>
                  <div className="space-y-3">
                    {financialAnalytics && (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-sm font-medium">Emergency</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.emergencyRevenue)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span className="text-sm font-medium">Lab</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.labRevenue)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-sm font-medium">X-ray</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.xrayRevenue)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-sm font-medium">Operations</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.operationsRevenue)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm font-medium">Pharmacy</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.pharmacySales)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-indigo-500" />
                            <span className="text-sm font-medium">Doctors</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatPkrAmount(financialAnalytics.doctorsRevenue)}</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="font-semibold mb-4">Recent Financial Activities</h3>
                  <div className="space-y-3">
                    {financialAnalytics?.recentActivity?.slice(0, 8).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${activity.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <div className="text-sm font-medium">{activity.type}</div>
                            <div className="text-xs text-gray-500">{activity.description}</div>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${activity.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {activity.amount > 0 ? '+' : ''}{formatPkrAmount(Math.abs(activity.amount))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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

            {/* <TabsContent value="finance">
              <AdminFinanceAnalytics />
            </TabsContent> */}

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
                         onChange={(e) => {
                           setSearchTerm(e.target.value);
                           setCurrentPage(1);
                         }}
                         className="w-full"
                       />
                    </div>
                     <Select value={roleFilter} onValueChange={(value) => {
                       setRoleFilter(value);
                       setCurrentPage(1);
                     }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Roles</SelectItem>
                         <SelectItem value="admin">Admin</SelectItem>
                         <SelectItem value="doctor">Doctor</SelectItem>
                         <SelectItem value="staff">Staff</SelectItem>
                         <SelectItem value="ota">OTA</SelectItem>
                         <SelectItem value="nursing">Nursing</SelectItem>
                         <SelectItem value="head_pharmacist">Head Pharmacist</SelectItem>
                         <SelectItem value="assistant_pharmacist">Assistant Pharmacist</SelectItem>
                         <SelectItem value="salesman_pharmacist">Salesman Pharmacist</SelectItem>
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
                        {paginatedUsers.map((user) => (
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
                                  onClick={() => handleToggleUserStatus(user)}
                                  disabled={updateUserStatus.isPending}
                                >
                                  {user.is_active ? 'Block' : 'Unblock'}
                                </Button>
                                {user.role !== 'admin' && (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleDeleteUser(user)}
                                    disabled={deleteUser.isPending}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                     </Table>
                   </div>
                   
                   {/* Pagination */}
                   {totalPages > 1 && (
                     <div className="flex items-center justify-between pt-4 border-t">
                       <div className="text-sm text-gray-600">
                         Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
                       </div>
                       <div className="flex items-center gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                           disabled={currentPage === 1}
                         >
                           Previous
                         </Button>
                          <div className="flex items-center gap-1">
                            {(() => {
                              const delta = 2;
                              const range = [];
                              const rangeWithDots = [];

                              for (let i = Math.max(2, currentPage - delta); 
                                   i <= Math.min(totalPages - 1, currentPage + delta); 
                                   i++) {
                                range.push(i);
                              }

                              if (currentPage - delta > 2) {
                                rangeWithDots.push(1, '...');
                              } else {
                                rangeWithDots.push(1);
                              }

                              rangeWithDots.push(...range);

                              if (currentPage + delta < totalPages - 1) {
                                rangeWithDots.push('...', totalPages);
                              } else if (totalPages > 1) {
                                rangeWithDots.push(totalPages);
                              }

                              return rangeWithDots.map((page, index) => {
                                if (page === '...') {
                                  return <span key={`dots-${index}`} className="px-2">...</span>;
                                }
                                return (
                                  <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page as number)}
                                    className="w-8 h-8 p-0"
                                  >
                                    {page}
                                  </Button>
                                );
                              });
                            })()}
                          </div>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                           disabled={currentPage === totalPages}
                         >
                           Next
                         </Button>
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            </TabsContent>

            <TabsContent value="pharmacy">
              <PharmacyOverview />
            </TabsContent>

            <TabsContent value="lab">
              <AdminLabs />
            </TabsContent>

            <TabsContent value="xray">
              <AdminXrays />
            </TabsContent>

            <TabsContent value="ot">
              <AdminOT />
            </TabsContent>

            <TabsContent value="emergency">
              <EmergencyExpensesManager />
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
                  <div className="space-y-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
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
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="medicine">Medicine</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="ot">OT Operations</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="appointment">Appointments</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From Date:</label>
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="w-40"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To Date:</label>
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="w-40"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateFrom("");
                          setDateTo("");
                          setLogSearchTerm("");
                          setActionFilter("all");
                        }}
                        className="whitespace-nowrap"
                      >
                        Clear Filters
                      </Button>
                    </div>
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
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow 
                            key={log.id}
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => handleSystemLogClick(log)}
                          >
                            <TableCell className="font-mono text-sm">
                              {format(new Date(log.created_at || ''), 'MMM dd, yyyy HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              {log.user_profile ? `${log.user_profile.first_name} ${log.user_profile.last_name} (${log.user_profile.email})` : (log.user_id ? `User ID: ${log.user_id}` : 'System')}
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
                            <TableCell>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSystemLogClick(log);
                                }}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">Hospital Settings</h3>
                    <p className="text-gray-600">Configure hospital branding, timings and operational settings</p>
                  </div>
                </div>

                {/* Hospital Branding Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h4 className="text-lg font-semibold mb-4">Hospital Branding</h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hospital Name
                        </label>
                        <Input 
                          placeholder="Enter hospital name"
                          value={brandingForm.hospital_name} 
                          onChange={(e) => setBrandingForm(prev => ({ ...prev, hospital_name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hospital Logo
                        </label>
                        <div className="flex items-center gap-4">
                          {(hospitalSettings?.logo_url || brandingForm.logo_url) && (
                            <img 
                              src={hospitalSettings?.logo_url || brandingForm.logo_url} 
                              alt="Hospital Logo" 
                              className="w-12 h-12 object-contain rounded border"
                            />
                          )}
                          <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setLogoFile(file);
                              }
                            }}
                          />
                        </div>
                        {logoFile && (
                          <p className="text-sm text-gray-600 mt-2">
                            Selected: {logoFile.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <Button 
                        onClick={handleSaveBranding}
                        className="w-full"
                        disabled={!brandingForm.hospital_name.trim() && !logoFile}
                      >
                        Save Hospital Branding
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h4 className="text-lg font-semibold mb-4">Hospital Timings</h4>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Opening Time
                          </label>
                          <Input 
                            type="time" 
                            value={hospitalSettings?.opening_time || "08:00"} 
                            onChange={(e) => setTimingsForm(prev => ({ ...prev, opening_time: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Closing Time
                          </label>
                          <Input 
                            type="time" 
                            value={hospitalSettings?.closing_time || "20:00"} 
                            onChange={(e) => setTimingsForm(prev => ({ ...prev, closing_time: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Working Days
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <label key={day} className="flex items-center">
                              <input 
                                type="checkbox" 
                                className="mr-2" 
                                defaultChecked={day !== 'Sunday'}
                              />
                              <span className="text-sm">{day}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full">Save Hospital Timings</Button>
                     </div>
                   </div>
                 </div>

                  {/* Financial Settings */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h4 className="text-lg font-semibold mb-4">Financial Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Emergency Consultation Fee (PKR)
                        </label>
                        <Input 
                          type="number" 
                          value={timingsForm.emergency_consultation_fee}
                          onChange={(e) => setTimingsForm(prev => ({ ...prev, emergency_consultation_fee: parseInt(e.target.value) || 0 }))}
                          min="0" 
                          step="100"
                          placeholder="Enter emergency consultation fee"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Fee charged for emergency consultations ({formatPkrAmount(timingsForm.emergency_consultation_fee)})
                        </p>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={async () => {
                          const success = await updateSettings({
                            emergency_consultation_fee: timingsForm.emergency_consultation_fee
                          });
                           if (success) {
                             toastHook({
                               title: "Success",
                               description: "Emergency consultation fee updated successfully",
                             });
                           }
                        }}
                      >
                        Save Financial Settings
                      </Button>
                    </div>
                  </div>

                  {/* Payroll Settings */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h4 className="text-lg font-semibold mb-4">Payroll Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Monthly Payment Date (Day of Month)
                        </label>
                        <Input 
                          type="number" 
                          value={hospitalSettings?.payroll_payment_date || 1}
                          onChange={(e) => setTimingsForm(prev => ({ ...prev, payroll_payment_date: parseInt(e.target.value) }))}
                          min="1" 
                          max="31" 
                          placeholder="Enter day of month (1-31)"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Day of month when salaries should be paid (e.g., 1 for 1st of every month)
                        </p>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={async () => {
                          const success = await updateSettings({
                            payroll_payment_date: timingsForm.payroll_payment_date || hospitalSettings?.payroll_payment_date || 1
                          });
                           if (success) {
                             toastHook({
                               title: "Success",
                               description: "Payroll settings updated successfully",
                             });
                           }
                        }}
                      >
                        Save Payroll Settings
                      </Button>
                    </div>
                  </div>

                 {/* Hospital Information */}
                 <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                   <h4 className="text-lg font-semibold mb-4">Hospital Information</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Hospital Name
                       </label>
                       <Input 
                         value={hospitalForm.hospital_name}
                         onChange={(e) => setHospitalForm(prev => ({ ...prev, hospital_name: e.target.value }))}
                         placeholder="Enter hospital name"
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Contact Number
                       </label>
                       <Input 
                         value={hospitalForm.contact_number}
                         onChange={(e) => setHospitalForm(prev => ({ ...prev, contact_number: e.target.value }))}
                         placeholder="Enter contact number"
                       />
                     </div>
                     <div className="md:col-span-2">
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Hospital Address
                       </label>
                       <Input 
                         value={hospitalForm.hospital_address}
                         onChange={(e) => setHospitalForm(prev => ({ ...prev, hospital_address: e.target.value }))}
                        />
                      </div>
                      <div className="mt-6">
                        <Button 
                          className="w-full"
                          onClick={async () => {
                            const success = await updateSettings({
                              hospital_name: hospitalForm.hospital_name,
                              contact_number: hospitalForm.contact_number,
                              hospital_address: hospitalForm.hospital_address
                            });
                             if (success) {
                               toastHook({
                                 title: "Success",
                                 description: "Hospital information updated successfully",
                               });
                             }
                          }}
                        >
                          Save Hospital Information
                        </Button>
                      </div>
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

            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete {userToDelete?.first_name} {userToDelete?.last_name}? 
                    This action cannot be undone and will remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={confirmDeleteUser}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete User
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AuditLogDetailDialog 
              log={selectedSystemLog}
              open={showSystemLogDetail}
              onOpenChange={setShowSystemLogDetail}
            />
          </div>
        </div>
      </div>
    );
  }
