
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import PatientLayout from "@/layouts/PatientLayout";
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, Banknote, Activity, Clock, Users, TestTube, Upload, Building2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppointmentBooking } from "@/components/AppointmentBooking";
import { MyAppointments } from "@/components/MyAppointments";
import { HospitalTimingCard } from "@/components/HospitalTimingCard";
import PatientRecords from "./patient/PatientRecords";
import PatientLabs from "./patient/PatientLabs";
import PatientInvoices from "./patient/PatientInvoices";
import PatientOT from "./patient/PatientOT";
import { PatientSettings } from "@/components/PatientSettings";

export default function DashboardPatient() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch patient-specific data
  const { data: patientAppointments = [] } = useQuery({
    queryKey: ['patient-appointments', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:doctors(*, profiles(first_name, last_name))
        `)
        .eq('patient_id', profile.id)
        .eq('status', 'scheduled')
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: patientMedicalRecords = [] } = useQuery({
    queryKey: ['patient-medical-records', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', profile.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: patientInvoices = [] } = useQuery({
    queryKey: ['patient-invoices', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('patient_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: patientLabReports = [] } = useQuery({
    queryKey: ['patient-lab-reports', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('patient_id', profile.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['patient-recent-activity', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id
  });

  // Calculate stats
  const upcomingAppointments = patientAppointments.length;
  const totalMedicalRecords = patientMedicalRecords.length;
  const outstandingBills = patientInvoices
    .filter(invoice => invoice.status === 'pending')
    .reduce((total, invoice) => total + (invoice.amount || 0), 0);
  const totalLabReports = patientLabReports.length;

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold">Welcome back, {profile?.first_name}!</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatsCard
          title="Upcoming Appointments"
          value={upcomingAppointments.toString()}
          icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
        />
        <StatsCard
          title="Medical Records"
          value={totalMedicalRecords.toString()}
          icon={<FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
        />
        <StatsCard
          title="Outstanding Bills"
          value={`Rs. ${(outstandingBills * 278).toFixed(2)}`}
          icon={<Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
        />
        <StatsCard
          title="Lab Reports"
          value={totalLabReports.toString()}
          icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">Upcoming Appointments</h3>
          {patientAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="hidden sm:block">
                <DemoTable
                  columns={["Date", "Doctor", "Type"]}
                  data={patientAppointments.slice(0, 5).map(appointment => [
                    format(new Date(appointment.appointment_date), 'MMM d, yyyy'),
                    appointment.doctor?.profiles ? 
                      `Dr. ${(appointment.doctor as any).profiles?.first_name} ${(appointment.doctor as any).profiles?.last_name}` : 
                      'Unknown Doctor',
                    appointment.type || 'Consultation'
                  ])}
                />
              </div>
              <div className="sm:hidden space-y-2">
                {patientAppointments.slice(0, 3).map((appointment, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">
                      {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {appointment.doctor?.profiles ? 
                        `Dr. ${(appointment.doctor as any).profiles?.first_name} ${(appointment.doctor as any).profiles?.last_name}` : 
                        'Unknown Doctor'}
                    </div>
                    <div className="text-xs text-blue-600">{appointment.type || 'Consultation'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No upcoming appointments</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-4 sm:p-6">
          <h3 className="font-semibold mb-4 text-sm sm:text-base">Recent Invoices</h3>
          {patientInvoices.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="hidden sm:block">
                <DemoTable
                  columns={["Invoice #", "Date", "Amount", "Status"]}
                  data={patientInvoices.slice(0, 5).map(invoice => [
                    invoice.invoice_number,
                    format(new Date(invoice.created_at), 'MMM d, yyyy'),
                    `Rs. ${(invoice.amount * 278).toFixed(2)}`,
                    invoice.status === 'paid' ? 'Paid' : 'Pending'
                  ])}
                />
              </div>
              <div className="sm:hidden space-y-2">
                {patientInvoices.slice(0, 3).map((invoice, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium">{invoice.invoice_number}</div>
                    <div className="text-xs text-gray-600">
                      {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-medium">Rs. {(invoice.amount * 278).toFixed(2)}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {invoice.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No invoices found</p>
          )}
        </div>

        {/* Hospital Timing Card */}
        <HospitalTimingCard />
      </div>

      <div className="mt-8">
        <AuditLog 
          title="Recent Activity"
          events={recentActivity.map(activity => ({
            who: activity.action.includes('appointment') ? 'System' : 'System',
            when: format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm'),
            what: activity.action,
            details: activity.details || 'No additional details'
          }))}
        />
      </div>
    </div>
  );

  const renderAppointmentsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold">Book Appointment</h2>
      <AppointmentBooking />
    </div>
  );

  const renderMyAppointmentsTab = () => (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold">My Appointments</h2>
      <MyAppointments />
    </div>
  );

  const renderRecordsTab = () => (
    <div className="space-y-6">
      <PatientRecords />
    </div>
  );

  const renderLabsTab = () => (
    <div className="space-y-6">
      <PatientLabs />
    </div>
  );

  const renderInvoicesTab = () => (
    <div className="space-y-6">
      <PatientInvoices />
    </div>
  );

  const renderOTTab = () => (
    <div className="space-y-6">
      <PatientOT />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <PatientSettings />
    </div>
  );

  return (
    <PatientLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto">
          <TabsList className="grid w-full min-w-max grid-cols-8 lg:grid-cols-8">
            <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="book-appointment" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden md:inline">Book Appointment</span>
              <span className="md:hidden">Book</span>
            </TabsTrigger>
            <TabsTrigger value="my-appointments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden md:inline">My Appointments</span>
              <span className="md:hidden">My Apt</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Records</span>
              <span className="sm:hidden">Records</span>
            </TabsTrigger>
            <TabsTrigger value="labs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <TestTube className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Lab Reports</span>
              <span className="sm:hidden">Labs</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Banknote className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Invoices</span>
              <span className="sm:hidden">Bills</span>
            </TabsTrigger>
            <TabsTrigger value="ot" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">OT</span>
              <span className="sm:hidden">OT</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="book-appointment" className="space-y-4">
          {renderAppointmentsTab()}
        </TabsContent>

        <TabsContent value="my-appointments" className="space-y-4">
          {renderMyAppointmentsTab()}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          {renderRecordsTab()}
        </TabsContent>

        <TabsContent value="labs" className="space-y-4">
          {renderLabsTab()}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          {renderInvoicesTab()}
        </TabsContent>

        <TabsContent value="ot" className="space-y-4">
          {renderOTTab()}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {renderSettingsTab()}
        </TabsContent>
      </Tabs>
    </PatientLayout>
  );
}
