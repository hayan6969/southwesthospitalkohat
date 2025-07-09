
import { useState, useEffect } from "react";
import { StatsCard } from "@/components/StatsCard";
import { MiniChart } from "@/components/MiniChart";
import { useAppointments, useStats, useMedicalRecords } from "@/hooks/useDatabase";
import { usePatientNames, useDoctorNames, getPatientName, getDoctorName } from "@/hooks/useDisplayHelpers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Users, Clock, CheckCircle, Plus, User, LogOut, Stethoscope, FileText, CalendarDays, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EnhancedAppointmentDialog } from "@/components/dialogs/EnhancedAppointmentDialog";

// Import doctor pages
import DoctorPatients from "@/pages/dashboard/doctor/DoctorPatients";
import DoctorSchedule from "@/pages/dashboard/doctor/DoctorSchedule";
import DoctorNotes from "@/pages/dashboard/doctor/DoctorNotes";
import DoctorConsultationRates from "@/pages/dashboard/doctor/DoctorConsultationRates";
import { DoctorProfileSettings } from "@/components/DoctorProfileSettings";

const chartData = {
  appointments: [{ value: 8 }, { value: 12 }, { value: 15 }, { value: 10 }, { value: 18 }],
  patients: [{ value: 45 }, { value: 52 }, { value: 58 }, { value: 55 }, { value: 62 }],
};

export default function DashboardDoctor() {
  const { profile, signOut } = useAuth();
  const { data: appointments, isLoading: appointmentsLoading } = useAppointments();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: medicalRecords, isLoading: recordsLoading } = useMedicalRecords();
  const { data: patientNames } = usePatientNames();
  const { data: doctorNames } = useDoctorNames();
  const [doctorProfile, setDoctorProfile] = useState<any>(null);

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

  // Filter today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments?.filter(apt => 
    apt.appointment_date.startsWith(today)
  ) || [];

  const upcomingAppointments = appointments?.filter(apt => 
    new Date(apt.appointment_date) > new Date() && apt.status === 'scheduled'
  ).slice(0, 5) || [];

  const recentRecords = medicalRecords?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Profile */}
      <header className="bg-white shadow-lg border-b-2 border-green-200 px-6 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="inline-block w-3 h-10 bg-green-500 rounded-full" />
              HIMS - Doctor Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Hospital Information Management System</p>
          </div>
          
          {/* Profile Section */}
          <div className="flex items-center gap-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-green-200">
                <AvatarImage src={doctorProfile?.avatar_url} alt="Doctor Avatar" />
                <AvatarFallback className="bg-green-100 text-green-700 text-lg font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-gray-900">
                  Dr. {profile?.first_name} {profile?.last_name}
                </span>
                <span className="text-sm text-gray-600">{profile?.email}</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold uppercase tracking-wide shadow-md">
                  Doctor
                </span>
                <span className="text-xs text-gray-500">Medical Professional</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={signOut} 
              className="flex items-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Medical Dashboard</h2>
            <div className="flex gap-3">
              <EnhancedAppointmentDialog />
              <Button variant="outline">View Full Schedule</Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-9">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="patients">Patient History</TabsTrigger>
              <TabsTrigger value="diagnoses">Diagnoses & Rx</TabsTrigger>
              <TabsTrigger value="notes">Patient Notes</TabsTrigger>
              <TabsTrigger value="labs">Lab Reports</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Today's Appointments"
                  value={todayAppointments.length}
                  icon={<Calendar className="w-5 h-5 text-blue-600" />}
                  chart={<MiniChart data={chartData.appointments} type="bar" color="#3b82f6" />}
                  loading={appointmentsLoading}
                />
                <StatsCard
                  title="Total Patients"
                  value={stats?.totalPatients || 0}
                  change="+12%"
                  changeType="positive"
                  icon={<Users className="w-5 h-5 text-green-600" />}
                  chart={<MiniChart data={chartData.patients} type="line" color="#10b981" />}
                  loading={statsLoading}
                />
                <StatsCard
                  title="Completed Today"
                  value={todayAppointments.filter(apt => apt.status === 'completed').length}
                  icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
                  loading={appointmentsLoading}
                />
                <StatsCard
                  title="Next Appointment"
                  value={upcomingAppointments[0] ? format(new Date(upcomingAppointments[0].appointment_date), 'h:mm a') : 'None'}
                  icon={<Clock className="w-5 h-5 text-orange-600" />}
                  loading={appointmentsLoading}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg text-gray-900">Today's Schedule</h3>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointmentsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                            </TableRow>
                          ))
                        ) : todayAppointments.length > 0 ? (
                          todayAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium">
                                {format(new Date(appointment.appointment_date), 'h:mm a')}
                              </TableCell>
                              <TableCell>
                                {getPatientName(appointment.patient_id, patientNames || [])}
                              </TableCell>
                              <TableCell>{appointment.type}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {appointment.status}
                                </span>
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

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-lg text-gray-900">Recent Medical Records</h3>
                    <Button variant="outline" size="sm">View All</Button>
                  </div>
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Diagnosis</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recordsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                              <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse"></div></TableCell>
                            </TableRow>
                          ))
                        ) : recentRecords.length > 0 ? (
                          recentRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium">
                                {getPatientName(record.patient_id, patientNames || [])}
                              </TableCell>
                              <TableCell>
                                {format(new Date(record.visit_date), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>{record.diagnosis || 'No diagnosis'}</TableCell>
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Appointment Management</h3>
                <p className="text-gray-600 mb-4">View and manage all appointments</p>
                <div className="flex gap-3">
                  <EnhancedAppointmentDialog />
                  <Button variant="outline">Reschedule Appointment</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="patients">
              <DoctorPatients />
            </TabsContent>

            <TabsContent value="diagnoses">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Diagnoses & Prescriptions</h3>
                <p className="text-gray-600 mb-4">Manage patient diagnoses and prescription workflows</p>
                <div className="flex gap-3">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Diagnosis
                  </Button>
                  <Button variant="outline">View Prescriptions</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <DoctorNotes />
            </TabsContent>

            <TabsContent value="labs">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Lab Reports</h3>
                <p className="text-gray-600 mb-4">Review and manage patient lab results</p>
                <div className="flex gap-3">
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Request Lab Test
                  </Button>
                  <Button variant="outline">View All Reports</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="schedule">
              <DoctorSchedule />
            </TabsContent>

            <TabsContent value="settings">
              <DoctorProfileSettings />
            </TabsContent>

            <TabsContent value="analytics">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Doctor Analytics</h3>
                <p className="text-gray-600 mb-4">View performance metrics and patient statistics</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <StatsCard
                    title="This Month"
                    value="78"
                    change="+12%"
                    changeType="positive"
                    icon={<Calendar className="w-5 h-5 text-blue-600" />}
                  />
                  <StatsCard
                    title="Avg Rating"
                    value="4.8"
                    change="+0.2"
                    changeType="positive"
                    icon={<CheckCircle className="w-5 h-5 text-green-600" />}
                  />
                  <StatsCard
                    title="Response Time"
                    value="12min"
                    change="-3min"
                    changeType="positive"
                    icon={<Clock className="w-5 h-5 text-orange-600" />}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
