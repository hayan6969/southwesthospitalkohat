
import { useState, useEffect } from "react";
import { StatsCard } from "@/components/StatsCard";
import { MiniChart } from "@/components/MiniChart";
import { useAppointments, useMedicalRecords } from "@/hooks/useDatabase";
import { useRealStatsData } from "@/hooks/useRealStatsData";
import { useFinancialAnalytics } from "@/hooks/useFinancialAnalytics";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useDoctorTodayAppointments, useDoctorPatients } from "@/hooks/useDoctorData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Clock, CheckCircle, Plus, User, LogOut, Stethoscope, FileText, CalendarDays, ClipboardList, Banknote, Building2, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { formatTimeForDisplay } from "@/utils/timezone";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";
import { AppointmentDetailDialog } from "@/components/dialogs/AppointmentDetailDialog";

// Import doctor pages
import DoctorPatients from "@/pages/dashboard/doctor/DoctorPatients";
import DoctorSchedule from "@/pages/dashboard/doctor/DoctorSchedule";
import DoctorNotes from "@/pages/dashboard/doctor/DoctorNotes";
import DoctorConsultationRates from "@/pages/dashboard/doctor/DoctorConsultationRates";
import DoctorOT from "@/pages/dashboard/doctor/DoctorOT";
import { DoctorProfileSettings } from "@/components/DoctorProfileSettings";
import { DoctorAvailabilityManager } from "@/components/DoctorAvailabilityManager";
import { StopAppointmentsButton } from "@/components/StopAppointmentsButton";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { formatPkrAmount } from "@/utils/currency";
import { DoctorAnalytics } from "@/components/DoctorAnalytics";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";
import { PrescriptionDialog } from "@/components/dialogs/PrescriptionDialog";

export default function DashboardDoctor() {
  const { profile, signOut } = useAuth();
  const { settings: hospitalSettings } = useHospitalSettings();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const { data: realStats, isLoading: statsLoading } = useRealStatsData();
  const { data: financialAnalytics } = useFinancialAnalytics();
  const { data: medicalRecords, isLoading: recordsLoading } = useMedicalRecords();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const { data: todayAppointmentsData, isLoading: todayLoading } = useDoctorTodayAppointments();
  const { data: doctorPatientsData, isLoading: doctorPatientsLoading } = useDoctorPatients();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsAppointmentDialogOpen(true);
  };

  // Fetch doctor profile including avatar
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (profile?.id) {
        const { data } = await supabase
          .from('doctors')
          .select('avatar_url')
          .eq('id', profile.id)
          .single();
        setDoctorProfile(data);
      }
    };
    fetchDoctorProfile();
  }, [profile?.id]);

  // Filter today's appointments and calculate remaining
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments?.filter(apt => 
    apt.appointment_date.startsWith(today) && apt.doctor_id === profile?.id
  ) || [];

  const appointmentsLeft = todayAppointmentsData?.length || 0;

  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) > new Date() && apt.status === 'scheduled' && apt.doctor_id === profile?.id
  ).slice(0, 5) || [];

  // Filter medical records to only show records created by this doctor
  const doctorRecords = medicalRecords?.filter(record => 
    record.doctor_id === profile?.id
  ) || [];
  const recentRecords = doctorRecords.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Profile - Compact */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {hospitalSettings?.logo_url ? (
                  <img 
                    src={hospitalSettings.logo_url} 
                    alt="Hospital Logo" 
                    className="w-6 h-6 object-contain"
                  />
                ) : (
                  <span className="inline-block w-2 h-6 bg-green-500 rounded-full" />
                )}
                {hospitalSettings?.hospital_name || "HIMS"}
              </h1>
              <p className="text-gray-500 text-xs mt-0.5">Hospital Information Management System</p>
            </div>
            {profile?.role === 'admin' && <AdminDashboardNav />}
          </div>
          
          {/* Profile Section - Compact */}
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-green-200">
                <AvatarImage 
                  src={doctorProfile?.avatar_url || ''} 
                  alt="Doctor Avatar"
                  onError={(e) => {
                    console.log('Doctor dashboard avatar failed to load:', doctorProfile?.avatar_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback className="bg-green-100 text-green-700 text-sm font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  Dr. {profile?.first_name} {profile?.last_name}
                </span>
                <span className="text-xs text-gray-600">{profile?.email}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold uppercase tracking-wide shadow-sm">
                  Doctor
                </span>
                <span className="text-xs text-gray-500">Medical Professional</span>
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

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Medical Dashboard</h2>
            <div className="flex gap-2 sm:gap-3">
              <StopAppointmentsButton />
              <DoctorAvailabilityManager />
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-8 h-auto p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
              <TabsTrigger value="patients" className="text-xs sm:text-sm">Patient History</TabsTrigger>
              <TabsTrigger value="diagnoses" className="text-xs sm:text-sm">Diagnoses & Rx</TabsTrigger>
              <TabsTrigger value="ot" className="text-xs sm:text-sm">OT Operations</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm">Patient Notes</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                <StatsCard
                  title="Today's Appointments"
                  value={todayAppointments.length}
                  icon={<Calendar className="w-5 h-5 text-blue-600" />}
                  chart={<MiniChart data={realStats?.chartData?.appointments || []} type="bar" color="#3b82f6" />}
                  loading={appointmentsLoading}
                />
                <StatsCard
                  title="My Total Patients"
                  value={doctorPatientsData?.totalCount || 0}
                  icon={<Users className="w-5 h-5 text-green-600" />}
                  loading={doctorPatientsLoading}
                />
                <StatsCard
                  title="Completed Today"
                  value={todayAppointments.filter(apt => apt.status === 'completed').length}
                  icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                  loading={appointmentsLoading}
                />
                <StatsCard
                  title="Appointments Left Today"
                  value={appointmentsLeft}
                  icon={<Clock className="w-5 h-5 text-orange-600" />}
                  loading={todayLoading}
                />
              </div>

              {/* Content Tables */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg text-gray-900">Today's Schedule</h3>
                      <Button variant="outline" size="sm">View All</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Time</TableHead>
                          <TableHead className="whitespace-nowrap">Patient</TableHead>
                          <TableHead className="whitespace-nowrap">Type</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointmentsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div></TableCell>
                            </TableRow>
                          ))
                        ) : todayAppointments.length > 0 ? (
                           todayAppointments.map((appointment) => (
                             <TableRow 
                               key={appointment.id} 
                               className="cursor-pointer hover:bg-gray-50"
                               onClick={() => handleAppointmentClick(appointment)}
                             >
                                <TableCell className="font-medium whitespace-nowrap">
                                  {formatTimeForDisplay(appointment.appointment_date)}
                                </TableCell>
                               <TableCell className="max-w-[120px] truncate">
                                 {getPatientName(appointment.patient_id, patientNames || [])}
                               </TableCell>
                               <TableCell className="max-w-[100px] truncate">{appointment.type}</TableCell>
                                <TableCell>
                                  {appointment.status === 'completed' && appointment.cleared_at ? (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-purple-100 text-purple-700">
                                      Completed (Free)
                                    </span>
                                  ) : (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                      appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {appointment.status}
                                    </span>
                                  )}
                                </TableCell>
                             </TableRow>
                           ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                              No appointments scheduled for today
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg text-gray-900">Recent Medical Records</h3>
                      <Button variant="outline" size="sm">View All</Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Patient</TableHead>
                          <TableHead className="whitespace-nowrap">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Diagnosis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recordsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div></TableCell>
                            </TableRow>
                          ))
                        ) : recentRecords.length > 0 ? (
                          recentRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium max-w-[120px] truncate">
                                {getPatientName(record.patient_id, patientNames || [])}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {format(new Date(record.visit_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{record.diagnosis || 'No diagnosis'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-gray-500 py-8">
                              No medical records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="appointments">
              <DoctorSchedule />
            </TabsContent>

            <TabsContent value="patients">
              <DoctorPatients />
            </TabsContent>

            <TabsContent value="diagnoses">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Medical Records & Prescriptions</h3>
                <p className="text-gray-600 mb-4">View and manage patient medical records and prescriptions</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Prescription</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 6 }).map((_, j) => (
                              <TableCell key={j}>
                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : doctorRecords.length > 0 ? (
                        doctorRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">
                              {getPatientName(record.patient_id, patientNames || [])}
                            </TableCell>
                            <TableCell>
                              {record.visit_date ? format(new Date(record.visit_date), 'MMM d, yyyy') : 'N/A'}
                            </TableCell>
                            <TableCell>{record.diagnosis || 'No diagnosis'}</TableCell>
                            <TableCell>{record.treatment || 'No treatment'}</TableCell>
                            <TableCell className="max-w-xs truncate">{record.prescription || 'No prescription'}</TableCell>
                            <TableCell className="max-w-xs truncate">{record.notes || 'No notes'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-12">
                            No medical records found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ot">
              <DoctorOT />
            </TabsContent>

            <TabsContent value="notes">
              <DoctorNotes />
            </TabsContent>

            <TabsContent value="settings">
              <DoctorProfileSettings />
            </TabsContent>

            <TabsContent value="analytics">
              <DoctorAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Appointment Detail Dialog */}
      <AppointmentDetailDialog
        isOpen={isAppointmentDialogOpen}
        onClose={() => setIsAppointmentDialogOpen(false)}
        appointment={selectedAppointment}
        patientName={selectedAppointment ? getPatientName(selectedAppointment.patient_id, patientNames || []) : ''}
      />
    </div>
  );
}
