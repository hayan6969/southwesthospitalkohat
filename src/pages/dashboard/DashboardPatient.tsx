
import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import PatientLayout from "@/layouts/PatientLayout";
import { StatsCard } from "@/components/StatsCard";
import { DemoTable } from "@/components/DemoTable";
import { AuditLog } from "@/components/AuditLog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, FileText, DollarSign, Activity, Clock, Users, TestTube, Upload, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AppointmentBooking } from "@/components/AppointmentBooking";
import { MyAppointments } from "@/components/MyAppointments";
import { HospitalTimingCard } from "@/components/HospitalTimingCard";
import PatientRecords from "./patient/PatientRecords";
import PatientLabs from "./patient/PatientLabs";
import PatientInvoices from "./patient/PatientInvoices";
import PatientOT from "./patient/PatientOT";

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
    <div>
      <h2 className="text-2xl font-bold mb-8">Welcome back, {profile?.first_name}!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Upcoming Appointments"
          value={upcomingAppointments.toString()}
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
        />
        <StatsCard
          title="Medical Records"
          value={totalMedicalRecords.toString()}
          icon={<FileText className="w-5 h-5 text-green-600" />}
        />
        <StatsCard
          title="Outstanding Bills"
          value={`$${outstandingBills.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5 text-red-600" />}
        />
        <StatsCard
          title="Lab Reports"
          value={totalLabReports.toString()}
          icon={<Activity className="w-5 h-5 text-purple-600" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Upcoming Appointments</h3>
          {patientAppointments.length > 0 ? (
            <DemoTable
              columns={["Date", "Doctor", "Type"]}
              data={patientAppointments.slice(0, 5).map(appointment => [
                format(new Date(appointment.appointment_date), 'MMM d, yyyy'),
                appointment.doctor?.profiles ? 
                  `Dr. ${appointment.doctor.profiles.first_name} ${appointment.doctor.profiles.last_name}` : 
                  'Unknown Doctor',
                appointment.type || 'Consultation'
              ])}
            />
          ) : (
            <p className="text-gray-500">No upcoming appointments</p>
          )}
        </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="font-semibold mb-4">Recent Invoices</h3>
          {patientInvoices.length > 0 ? (
            <DemoTable
              columns={["Invoice #", "Date", "Amount", "Status"]}
              data={patientInvoices.slice(0, 5).map(invoice => [
                invoice.invoice_number,
                format(new Date(invoice.created_at), 'MMM d, yyyy'),
                `$${invoice.amount.toFixed(2)}`,
                invoice.status === 'paid' ? 'Paid' : 'Pending'
              ])}
            />
          ) : (
            <p className="text-gray-500">No invoices found</p>
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
    <div>
      <h2 className="text-2xl font-bold mb-8">Book Appointment</h2>
      <AppointmentBooking />
    </div>
  );

  const renderMyAppointmentsTab = () => (
    <div>
      <h2 className="text-2xl font-bold mb-8">My Appointments</h2>
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

  return (
    <PatientLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="book-appointment" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Book Appointment
          </TabsTrigger>
          <TabsTrigger value="my-appointments" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            My Appointments
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Records
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Lab Reports
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="ot" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            OT
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </PatientLayout>
  );
}
